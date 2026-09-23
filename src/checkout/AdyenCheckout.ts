//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import NativeCheckout, {
  type CheckoutEvent,
  type CheckoutResponse,
} from '../specs/NativeAdyenCheckout';
import {
  type AdvancedCallbacks,
  type AdyenError,
  type Checkout,
  type BeforeSubmitData,
  type Configuration,
  type PaymentDetailsData,
  type PaymentAction,
  type PaymentMethodData,
  type PaymentMethodsResponse,
  type PaymentResult,
  type ApplePayAuthorizationResult,
  type ApplePayCouponCodeResult,
  type ApplePayShippingContactResult,
  type ApplePayShippingMethodResult,
  type SessionCallbacks,
  type SessionConfiguration,
  type SessionsResult,
} from '../core';
import { checkConfiguration } from './utils/checkConfiguration';
import { checkPaymentMethodsResponse } from './utils/checkPaymentMethodsResponse';
import {
  createCheckout,
  type CheckoutCallbacks,
  type CheckoutHandle,
} from './createCheckout';
import { asCheckoutError } from './errors';
import type { CheckoutLifecycle } from './types';

const MERCHANT_CALLBACK_FAILURE = JSON.stringify({
  type: 'failure',
  code: 'cancelled',
});

const eventHandlers = new Map<string, CheckoutHandle>();
let activeCheckout: CheckoutHandle | undefined;
let eventSubscription:
  | {
      remove(): void;
    }
  | undefined;
let setupTransition: Promise<void> = Promise.resolve();

function parsePayload<T>(payloadJson?: string): T {
  if (!payloadJson) {
    return {} as T;
  }
  return JSON.parse(payloadJson) as T;
}

function responseFor(
  event: CheckoutEvent,
  payloadJson: string = MERCHANT_CALLBACK_FAILURE
): CheckoutResponse | undefined {
  if (!event.operationId || !event.requestId) {
    return undefined;
  }

  return {
    checkoutId: event.checkoutId,
    operationId: event.operationId,
    requestId: event.requestId,
    kind: event.kind,
    payloadJson,
  };
}

function sendResponse(
  event: CheckoutEvent,
  payloadJson?: string
): Promise<void> {
  const response = responseFor(event, payloadJson);
  return response ? NativeCheckout.respond(response) : Promise.resolve();
}

async function settleRequest(
  event: CheckoutEvent,
  callback: () => unknown | Promise<unknown>,
  validate: (result: unknown) => boolean = () => true
): Promise<void> {
  try {
    const result = await callback();
    if (!validate(result)) {
      await sendResponse(event);
      return;
    }
    await sendResponse(event, JSON.stringify(result));
  } catch {
    // A merchant error must settle the native continuation, rather than leave it suspended.
    await sendResponse(event);
  }
}

function isSubmitResult(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  switch (value.type) {
    case 'action':
      return isPaymentAction(value.action);
    case 'completed':
      return typeof value.resultCode === 'string';
    case 'retry':
      return value.message === undefined || typeof value.message === 'string';
    default:
      return false;
  }
}

function isPaymentAction(value: unknown): value is PaymentAction {
  return (
    isRecord(value) &&
    typeof value.type === 'string' &&
    typeof value.paymentMethodType === 'string'
  );
}

function normalizePaymentAction(value: unknown): PaymentAction | undefined {
  if (!isPaymentAction(value)) {
    return undefined;
  }

  return {
    type: value.type,
    paymentMethodType: value.paymentMethodType,
    ...(typeof value.subtype === 'string' ? { subtype: value.subtype } : {}),
    ...(typeof value.paymentData === 'string'
      ? { paymentData: value.paymentData }
      : {}),
    ...(typeof value.method === 'string' ? { method: value.method } : {}),
    ...(typeof value.url === 'string' ? { url: value.url } : {}),
    ...(typeof value.alternativeReference === 'string'
      ? { alternativeReference: value.alternativeReference }
      : {}),
    ...(typeof value.downloadUrl === 'string'
      ? { downloadUrl: value.downloadUrl }
      : {}),
    ...(typeof value.entity === 'string' ? { entity: value.entity } : {}),
    ...(typeof value.expiresAt === 'string'
      ? { expiresAt: value.expiresAt }
      : {}),
    ...(typeof value.instructionsUrl === 'string'
      ? { instructionsUrl: value.instructionsUrl }
      : {}),
    ...(typeof value.issuer === 'string' ? { issuer: value.issuer } : {}),
    ...(typeof value.maskedTelephoneNumber === 'string'
      ? { maskedTelephoneNumber: value.maskedTelephoneNumber }
      : {}),
    ...(typeof value.merchantName === 'string'
      ? { merchantName: value.merchantName }
      : {}),
    ...(typeof value.merchantReference === 'string'
      ? { merchantReference: value.merchantReference }
      : {}),
    ...(typeof value.reference === 'string'
      ? { reference: value.reference }
      : {}),
    ...(typeof value.shopperEmail === 'string'
      ? { shopperEmail: value.shopperEmail }
      : {}),
    ...(typeof value.shopperName === 'string'
      ? { shopperName: value.shopperName }
      : {}),
    ...(typeof value.qrCodeData === 'string'
      ? { qrCodeData: value.qrCodeData }
      : {}),
    ...(typeof value.token === 'string' ? { token: value.token } : {}),
    ...(typeof value.authorisationToken === 'string'
      ? { authorisationToken: value.authorisationToken }
      : {}),
    ...(isRecord(value.sdkData) ? { sdkData: value.sdkData } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSessionResult(payloadJson?: string): SessionsResult {
  const payload = parsePayload<unknown>(payloadJson);
  if (
    !isRecord(payload) ||
    typeof payload.sessionId !== 'string' ||
    typeof payload.resultCode !== 'string'
  ) {
    throw new Error('Invalid session terminal payload');
  }

  return {
    sessionId: payload.sessionId,
    resultCode: payload.resultCode as SessionsResult['resultCode'],
    ...(typeof payload.sessionResult === 'string'
      ? { sessionResult: payload.sessionResult }
      : {}),
    ...(typeof payload.sessionData === 'string'
      ? { sessionData: payload.sessionData }
      : {}),
  };
}

function normalizePaymentResult(payloadJson?: string): PaymentResult {
  const payload = parsePayload<unknown>(payloadJson);
  if (!isRecord(payload)) {
    throw new Error('Invalid advanced terminal payload');
  }
  const action = normalizePaymentAction(payload.action);

  return {
    ...(typeof payload.resultCode === 'string'
      ? { resultCode: payload.resultCode as PaymentResult['resultCode'] }
      : {}),
    ...(action ? { action } : {}),
    ...(typeof payload.refusalReason === 'string'
      ? { refusalReason: payload.refusalReason }
      : {}),
  };
}

function isBeforeSubmitResult(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const result = value as {
    type?: unknown;
    data?: unknown;
    sessionData?: unknown;
  };
  if (result.type === 'abort') {
    return true;
  }
  if (result.type !== 'proceed' || !isBeforeSubmitData(result.data)) {
    return false;
  }
  return (
    result.sessionData === undefined || typeof result.sessionData === 'string'
  );
}

function isBeforeSubmitData(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const data = value as Record<string, unknown>;
  return (
    (data.billingAddress === undefined ||
      (typeof data.billingAddress === 'object' &&
        data.billingAddress !== null &&
        !Array.isArray(data.billingAddress))) &&
    (data.deliveryAddress === undefined ||
      (typeof data.deliveryAddress === 'object' &&
        data.deliveryAddress !== null &&
        !Array.isArray(data.deliveryAddress))) &&
    (data.shopperName === undefined || isShopperName(data.shopperName)) &&
    (data.shopperEmail === undefined || typeof data.shopperEmail === 'string')
  );
}

function isShopperName(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const shopperName = value as {
    firstName?: unknown;
    lastName?: unknown;
  };
  return (
    (shopperName.firstName === undefined ||
      typeof shopperName.firstName === 'string') &&
    (shopperName.lastName === undefined ||
      typeof shopperName.lastName === 'string')
  );
}

function isApplePayAuthorizationResult(
  value: unknown
): value is ApplePayAuthorizationResult {
  return (
    isRecord(value) &&
    (value.status === 'success' || value.status === 'failure') &&
    isApplePayErrors(value.errors)
  );
}

function isApplePayShippingContactResult(
  value: unknown
): value is ApplePayShippingContactResult {
  return (
    isRecord(value) &&
    isApplePaySummaryItems(value.paymentSummaryItems) &&
    isApplePayShippingMethods(value.shippingMethods) &&
    isApplePayErrors(value.errors)
  );
}

function isApplePayShippingMethodResult(
  value: unknown
): value is ApplePayShippingMethodResult {
  return isRecord(value) && isApplePaySummaryItems(value.paymentSummaryItems);
}

function isApplePayCouponCodeResult(
  value: unknown
): value is ApplePayCouponCodeResult {
  return isApplePayShippingContactResult(value);
}

function isApplePaySummaryItems(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (item) =>
          isRecord(item) &&
          typeof item.label === 'string' &&
          (typeof item.amount === 'string' ||
            typeof item.amount === 'number') &&
          (item.type === undefined ||
            item.type === 'pending' ||
            item.type === 'final')
      ))
  );
}

function isApplePayShippingMethods(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (method) =>
          isRecord(method) &&
          typeof method.label === 'string' &&
          (typeof method.amount === 'string' ||
            typeof method.amount === 'number') &&
          (method.type === undefined ||
            method.type === 'pending' ||
            method.type === 'final') &&
          (method.identifier === undefined ||
            typeof method.identifier === 'string') &&
          (method.detail === undefined || typeof method.detail === 'string') &&
          (method.startDate === undefined ||
            typeof method.startDate === 'string') &&
          (method.endDate === undefined || typeof method.endDate === 'string')
      ))
  );
}

function isApplePayErrors(value: unknown): boolean {
  return (
    value === undefined ||
    (Array.isArray(value) &&
      value.every(
        (error) =>
          isRecord(error) &&
          (error.type === 'shippingAddress' ||
            error.type === 'billingAddress' ||
            error.type === 'contactField' ||
            error.type === 'couponCode') &&
          (error.field === undefined || typeof error.field === 'string') &&
          typeof error.message === 'string'
      ))
  );
}

function normalizeTerminalError(): AdyenError {
  return {
    message: 'Checkout failed',
    errorCode: 'checkoutFailed',
  };
}

async function dispatchEvent(event: CheckoutEvent): Promise<void> {
  const checkout = eventHandlers.get(event.checkoutId);
  if (!checkout || !checkout.isActive()) {
    return;
  }

  const callbacks = checkout.callbacks;
  switch (event.kind) {
    case 'applePayAuthorization': {
      const authorize = callbacks.configuration?.applepay?.onAuthorize;
      if (!authorize) {
        await sendResponse(event, JSON.stringify({ status: 'success' }));
        return;
      }
      await settleRequest(
        event,
        () => authorize({ payment: parsePayload(event.payloadJson) }),
        isApplePayAuthorizationResult
      );
      return;
    }
    case 'applePayShippingContact': {
      const update = callbacks.configuration?.applepay?.onShippingContactChange;
      if (!update) {
        await sendResponse(event, '{}');
        return;
      }
      await settleRequest(
        event,
        () => update({ contact: parsePayload(event.payloadJson) }),
        isApplePayShippingContactResult
      );
      return;
    }
    case 'applePayShippingMethod': {
      const update = callbacks.configuration?.applepay?.onShippingMethodChange;
      if (!update) {
        await sendResponse(event, '{}');
        return;
      }
      await settleRequest(
        event,
        () => update({ shippingMethod: parsePayload(event.payloadJson) }),
        isApplePayShippingMethodResult
      );
      return;
    }
    case 'applePayCouponCode': {
      const update = callbacks.configuration?.applepay?.onCouponCodeChange;
      if (!update) {
        await sendResponse(event, '{}');
        return;
      }
      await settleRequest(
        event,
        () => {
          const couponCode = parsePayload<{ couponCode?: unknown }>(
            event.payloadJson
          ).couponCode;
          if (typeof couponCode !== 'string') {
            throw new Error('Invalid Apple Pay coupon code');
          }
          return update({ couponCode });
        },
        isApplePayCouponCodeResult
      );
      return;
    }
    case 'sessionBeforeSubmit': {
      const beforeSubmit = callbacks.session?.onBeforeSubmit;
      await settleRequest(
        event,
        async () => {
          const data = parsePayload<BeforeSubmitData>(event.payloadJson);
          return beforeSubmit ? beforeSubmit(data) : { type: 'proceed', data };
        },
        isBeforeSubmitResult
      );
      return;
    }
    case 'advancedSubmit':
      await settleRequest(
        event,
        () =>
          callbacks.advanced?.onSubmit(
            parsePayload<PaymentMethodData>(event.payloadJson)
          ),
        isSubmitResult
      );
      return;
    case 'advancedAdditionalDetails':
      await settleRequest(
        event,
        () =>
          callbacks.advanced?.onAdditionalDetails(
            parsePayload<PaymentDetailsData>(event.payloadJson)
          ),
        (result) =>
          !!result &&
          typeof result === 'object' &&
          typeof (result as { resultCode?: unknown }).resultCode === 'string'
      );
      return;
    case 'completion':
      try {
        if (checkout.flow === 'sessions') {
          callbacks.session?.onComplete(
            normalizeSessionResult(event.payloadJson)
          );
        } else {
          callbacks.advanced?.onComplete(
            normalizePaymentResult(event.payloadJson)
          );
        }
      } finally {
        checkout.markStale();
        eventHandlers.delete(event.checkoutId);
        if (activeCheckout === checkout) activeCheckout = undefined;
      }
      return;
    case 'error':
      try {
        if (checkout.flow === 'sessions') {
          callbacks.session?.onError(normalizeTerminalError());
        } else {
          callbacks.advanced?.onError(normalizeTerminalError());
        }
      } finally {
        checkout.markStale();
        eventHandlers.delete(event.checkoutId);
        if (activeCheckout === checkout) activeCheckout = undefined;
      }
      return;
    default:
      // Apple Pay and lookup callbacks are added with their platform integrations. Until a
      // callback is configured, settle any request deterministically instead of retaining it.
      await sendResponse(event);
  }
}

function ensureEventListener(): void {
  if (eventSubscription) return;
  eventSubscription = NativeCheckout.onCheckoutEvent(dispatchEvent);
}

function deactivateActiveCheckout(): void {
  if (!activeCheckout) return;
  activeCheckout.markStale();
  eventHandlers.delete(activeCheckout.checkoutId);
  activeCheckout = undefined;
}

async function replaceActiveCheckout(): Promise<void> {
  const checkout = activeCheckout;
  deactivateActiveCheckout();
  if (!checkout) return;
  try {
    await NativeCheckout.invalidate(checkout.checkoutId);
  } catch (error) {
    throw asCheckoutError(error, 'cleanup');
  }
}

function serializeSetup<Value>(setup: () => Promise<Value>): Promise<Value> {
  const transition = setupTransition.then(setup, setup);
  setupTransition = transition.then(
    () => undefined,
    () => undefined
  );
  return transition;
}

/**
 * Static entry point for the native-owned checkout coordinator.
 *
 * Returned handles retain only an opaque identity in a closure. They expose portable checkout
 * data and commands, never the setup configuration or native coordinator state.
 */
export class AdyenCheckout {
  static async setup(
    session: SessionConfiguration,
    configuration: Configuration,
    callbacks: SessionCallbacks
  ): Promise<Checkout> {
    return serializeSetup(async () => {
      ensureEventListener();
      await replaceActiveCheckout();
      checkConfiguration(configuration);
      const descriptor = await NativeCheckout.setupSession(
        JSON.stringify(session),
        JSON.stringify(configuration)
      ).catch((error: unknown) => {
        throw asCheckoutError(error, 'setup');
      });
      return AdyenCheckout.publishCheckout(descriptor, {
        session: callbacks,
        configuration,
      });
    });
  }

  static async setupAdvanced(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration,
    callbacks: AdvancedCallbacks
  ): Promise<Checkout> {
    return serializeSetup(async () => {
      ensureEventListener();
      await replaceActiveCheckout();
      checkConfiguration(configuration);
      checkPaymentMethodsResponse(paymentMethods);
      const descriptor = await NativeCheckout.setupAdvanced(
        JSON.stringify(paymentMethods),
        JSON.stringify(configuration)
      ).catch((error: unknown) => {
        throw asCheckoutError(error, 'setup');
      });
      return AdyenCheckout.publishCheckout(descriptor, {
        advanced: callbacks,
        configuration,
      });
    });
  }

  private static publishCheckout(
    descriptor: {
      checkoutId: string;
      flow: 'sessions' | 'advanced';
      paymentMethodsJson: string;
    },
    callbacks: CheckoutCallbacks
  ): Checkout {
    const paymentMethods = parsePayload<PaymentMethodsResponse>(
      descriptor.paymentMethodsJson
    );
    const lifecycle: CheckoutLifecycle = {
      onInvalidated: (checkout) => {
        eventHandlers.delete(checkout.checkoutId);
        if (activeCheckout === checkout) activeCheckout = undefined;
      },
    };
    const checkout = createCheckout(
      descriptor,
      paymentMethods,
      callbacks,
      lifecycle
    );
    activeCheckout = checkout;
    eventHandlers.set(descriptor.checkoutId, checkout);
    return checkout.publicHandle;
  }
}
