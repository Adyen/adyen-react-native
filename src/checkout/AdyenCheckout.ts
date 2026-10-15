//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import NativeCheckout, {
  type CheckoutDescriptor,
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
  type PaymentMethodData,
  type PaymentMethodsResponse,
  type PaymentMethodsView,
  type AddressLookup,
  type SessionCallbacks,
  type SessionConfiguration,
} from '../core';
import { checkConfiguration } from './utils/checkConfiguration';
import { checkPaymentMethodsResponse } from './utils/checkPaymentMethodsResponse';
import {
  isAdditionalDetailsResult,
  isSubmitResult,
} from './utils/checkAdvancedResults';
import { isBeforeSubmitResult } from './utils/checkSessionResults';
import {
  isApplePayAuthorizationResult,
  isApplePayCouponCodeResult,
  isApplePayShippingContactResult,
  isApplePayShippingMethodResult,
} from './utils/checkApplePayResults';
import { isAddressLookupItem } from './utils/checkAddressLookup';
import {
  parsePayload,
  parsePaymentResult,
  parseSessionResult,
} from './utils/parseTerminalPayload';
import {
  createCheckout,
  type CheckoutCallbacks,
  type CheckoutHandle,
} from './createCheckout';
import { asCheckoutError } from './errors';
import { createPaymentMethodsView } from './paymentMethodsView';
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

function nativeConfiguration(configuration: Configuration): Configuration {
  if (configuration.card?.addressVisibility !== 'lookup') {
    return configuration;
  }

  return {
    ...configuration,
    card: {
      ...configuration.card,
      // This is private native configuration metadata. Callback functions themselves do not
      // cross the JSON boundary, but native must reject lookup rather than silently changing the
      // requested address UI if the approved pair was not validated here.
      addressLookupCallbacksEnabled: true,
    },
  } as Configuration;
}

function validateCheckoutConfiguration(configuration: Configuration): void {
  try {
    checkConfiguration(configuration);
  } catch {
    throw { code: 'invalidConfiguration', phase: 'setup' };
  }
}

function addressLookupFor(event: CheckoutEvent): AddressLookup {
  let settled = false;
  const respond = (payload: unknown) => {
    if (settled) return;
    settled = true;
    Promise.resolve(sendResponse(event, JSON.stringify(payload))).catch(
      () => {}
    );
  };

  return {
    update(results) {
      if (!Array.isArray(results) || !results.every(isAddressLookupItem)) {
        respond({ type: 'reject', message: 'Invalid address lookup results' });
        return;
      }
      respond({ results });
    },
    confirm(address) {
      if (!isAddressLookupItem(address)) {
        respond({ type: 'reject', message: 'Invalid address selection' });
        return;
      }
      respond({ address: address.address });
    },
    reject(error) {
      respond({ type: 'reject', message: error?.message });
    },
  };
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
    case 'addressLookupSearch': {
      const updateAddress = callbacks.configuration?.card?.onUpdateAddress;
      const query = parsePayload<{ query?: unknown }>(event.payloadJson).query;
      if (!updateAddress || typeof query !== 'string') {
        await sendResponse(event);
        return;
      }
      try {
        const lookup = addressLookupFor(event);
        Promise.resolve(updateAddress(query, lookup)).catch(() =>
          lookup.reject({ message: 'Address lookup callback failed' })
        );
      } catch {
        await sendResponse(event);
      }
      return;
    }
    case 'addressLookupSelection': {
      const confirmAddress = callbacks.configuration?.card?.onConfirmAddress;
      const candidate = parsePayload<unknown>(event.payloadJson);
      if (!confirmAddress || !isAddressLookupItem(candidate)) {
        await sendResponse(event);
        return;
      }
      try {
        const lookup = addressLookupFor(event);
        Promise.resolve(confirmAddress(candidate, lookup)).catch(() =>
          lookup.reject({ message: 'Address confirmation callback failed' })
        );
      } catch {
        await sendResponse(event);
      }
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
        isAdditionalDetailsResult
      );
      return;
    case 'completion':
      try {
        if (checkout.flow === 'sessions') {
          callbacks.session?.onComplete(parseSessionResult(event.payloadJson));
        } else {
          callbacks.advanced?.onComplete(parsePaymentResult(event.payloadJson));
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
      validateCheckoutConfiguration(configuration);
      const descriptor = await NativeCheckout.setupSession(
        JSON.stringify(session),
        JSON.stringify(nativeConfiguration(configuration))
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
      validateCheckoutConfiguration(configuration);
      checkPaymentMethodsResponse(paymentMethods);
      const descriptor = await NativeCheckout.setupAdvanced(
        JSON.stringify(paymentMethods),
        JSON.stringify(nativeConfiguration(configuration))
      ).catch((error: unknown) => {
        throw asCheckoutError(error, 'setup');
      });
      return AdyenCheckout.publishCheckout(descriptor, {
        advanced: callbacks,
        configuration,
      });
    });
  }

  private static async publishCheckout(
    descriptor: CheckoutDescriptor,
    callbacks: CheckoutCallbacks
  ): Promise<Checkout> {
    let paymentMethods: PaymentMethodsView;
    try {
      paymentMethods = createPaymentMethodsView(descriptor.paymentMethodsJson);
    } catch (error) {
      // The native checkout already exists; release it so a rejected setup leaves no residue.
      try {
        await NativeCheckout.invalidate(descriptor.checkoutId);
      } catch {
        // The setup failure is the error the caller needs; cleanup is best effort.
      }
      throw asCheckoutError(error, 'setup');
    }
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
