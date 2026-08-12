//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { EmitterSubscription } from 'react-native';
import type {
  AdvancedCallbacks,
  ApplePayAuthorizationActions,
  ApplePayAuthorizationResult,
  ApplePayCouponCodeUpdateRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethodUpdateRequest,
  Checkout,
  Configuration,
  PaymentMethodsResponse,
  PaymentResultHandler,
  PaymentSubmitResultHandler,
  SessionCallbacks,
  SessionConfiguration,
} from './core';
import { createCheckout } from './core/Checkout';
import { AdyenContext } from './modules/context/ContextModule';
import { AdyenComponent as AdyenComponentModule } from './modules/component/AdyenComponentModule';
import { ComponentProxy } from './modules/component/ComponentProxy';
import {
  startEventListeners,
  type EventHandlerRefs,
} from './components/utils/startEventListeners';
import { checkConfiguration } from './components/utils/checkConfiguration';

// Result handlers for callbacks
const createResultHandler = (): PaymentResultHandler => ({
  completion: (resultCode) => AdyenContext.completion(resultCode),
});

const createSubmitHandler = (): PaymentSubmitResultHandler => ({
  action: (action) => AdyenContext.action(action),
  completion: (resultCode) => AdyenContext.completion(resultCode),
  retry: (message) => AdyenContext.retry(message),
});

/**
 * Static entry point for the Adyen checkout.
 *
 * Cross-platform aligned: matches the setup/cleanup pattern used by iOS,
 * Android, and Flutter SDKs. Auto-cleans native resources when terminal
 * callbacks fire (onComplete / onError).
 *
 * @example
 * ```tsx
 * const checkout = await AdyenCheckout.setup(session, config, callbacks);
 * AdyenDropIn.start(checkout);
 * // or
 * <AdyenComponent checkout={checkout} type="scheme" />
 * // Auto-cleanup on terminal callbacks. Manual: checkout.cleanup()
 * ```
 */
export class AdyenCheckout {
  // --- Internal state ---
  private static configuration: Configuration | null = null;
  private static sessionCallbacks: SessionCallbacks | null = null;
  private static advancedCallbacks: AdvancedCallbacks | null = null;
  // @ts-expect-error Written but not yet read — reserved for future use (e.g. getActiveCheckout).
  private static activeCheckout: Checkout | null = null;
  private static subscriptions: Map<string, EmitterSubscription[]> = new Map();
  private static isCleanedUp = true;

  // Event handler refs (using .current for compatibility with startEventListeners)
  private static eventHandlerRefs: EventHandlerRefs = {
    onSubmit: { current: undefined },
    onError: { current: () => {} },
    onComplete: { current: undefined },
    onAdditionalDetails: { current: undefined },
    config: { current: null },
  };

  /**
   * Sets up a session-based checkout flow.
   *
   * @param session - The session configuration from the `/sessions` response.
   * @param configuration - The checkout configuration.
   * @param callbacks - Callbacks invoked for the session lifecycle.
   * @returns A {@link Checkout} that can be passed to Drop-in or embedded components.
   */
  static async setup(
    session: SessionConfiguration,
    configuration: Configuration,
    callbacks: SessionCallbacks
  ): Promise<Checkout> {
    // Auto-clean any previous context
    if (!AdyenCheckout.isCleanedUp) {
      AdyenCheckout.cleanup();
    }

    checkConfiguration(configuration);
    AdyenCheckout.configuration = configuration;
    AdyenCheckout.sessionCallbacks = callbacks;
    AdyenCheckout.advancedCallbacks = null;
    AdyenCheckout.isCleanedUp = false;
    AdyenCheckout.eventHandlerRefs.config.current = configuration;

    // Wire event handler refs for per-view routing
    AdyenCheckout.eventHandlerRefs.onSubmit.current = undefined;
    AdyenCheckout.eventHandlerRefs.onAdditionalDetails.current = undefined;
    AdyenCheckout.eventHandlerRefs.onComplete.current = (result, component) =>
      AdyenCheckout.sessionCallbacks?.onComplete(result, component);
    AdyenCheckout.eventHandlerRefs.onError.current = (error, component) => {
      AdyenCheckout.sessionCallbacks?.onError(error, component);
    };

    // Wire native event listeners
    AdyenContext.removeAllListeners();
    AdyenContext.assignCompletionHandler((result) => {
      AdyenCheckout.sessionCallbacks?.onComplete(result, createResultHandler());
      AdyenCheckout.performAutoCleanup();
    });
    AdyenContext.assignErrorHandler((error) => {
      AdyenCheckout.sessionCallbacks?.onError(error, createResultHandler());
      AdyenCheckout.performAutoCleanup();
    });
    AdyenCheckout.subscribeApplePayHandlers();

    const context = await AdyenContext.createSession(
      { id: session.id, sessionData: session.sessionData },
      configuration
    );
    const checkout = createCheckout(
      context.paymentMethods,
      configuration,
      (viewId) => AdyenCheckout.subscribe(viewId),
      (viewId) => AdyenCheckout.unsubscribe(viewId),
      () => AdyenCheckout.cleanup()
    );
    AdyenCheckout.activeCheckout = checkout;
    return checkout;
  }

  /**
   * Sets up an advanced (merchant-managed) checkout flow.
   *
   * @param paymentMethods - The payment methods response from the Adyen API.
   * @param configuration - The checkout configuration.
   * @param callbacks - Callbacks invoked for the advanced lifecycle.
   * @returns A {@link Checkout} that can be passed to Drop-in or embedded components.
   */
  static async setupAdvanced(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration,
    callbacks: AdvancedCallbacks
  ): Promise<Checkout> {
    // Auto-clean any previous context
    if (!AdyenCheckout.isCleanedUp) {
      AdyenCheckout.cleanup();
    }

    checkConfiguration(configuration);
    AdyenCheckout.configuration = configuration;
    AdyenCheckout.advancedCallbacks = callbacks;
    AdyenCheckout.sessionCallbacks = null;
    AdyenCheckout.isCleanedUp = false;
    AdyenCheckout.eventHandlerRefs.config.current = configuration;

    // Wire event handler refs for per-view routing
    AdyenCheckout.eventHandlerRefs.onSubmit.current = (data, component) =>
      AdyenCheckout.advancedCallbacks?.onSubmit(
        data,
        component as PaymentSubmitResultHandler
      );
    AdyenCheckout.eventHandlerRefs.onAdditionalDetails.current = (
      data,
      component
    ) =>
      AdyenCheckout.advancedCallbacks?.onAdditionalDetails(
        data,
        component as unknown as import('./core').PaymentAdditionalResultHandler
      );
    AdyenCheckout.eventHandlerRefs.onError.current = (error, component) => {
      AdyenCheckout.advancedCallbacks?.onError(error, component);
    };
    AdyenCheckout.eventHandlerRefs.onComplete.current = undefined;

    // Wire native event listeners
    AdyenContext.removeAllListeners();
    AdyenContext.assignSubmitHandler(({ paymentData }) => {
      const payload = {
        ...paymentData,
        returnUrl: paymentData.returnUrl ?? configuration.returnUrl,
      };
      AdyenCheckout.advancedCallbacks?.onSubmit(payload, createSubmitHandler());
    });
    AdyenContext.assignAdditionalDetailsHandler((data) =>
      AdyenCheckout.advancedCallbacks?.onAdditionalDetails(
        data,
        createResultHandler()
      )
    );
    AdyenContext.assignAdvancedErrorHandler((error) => {
      AdyenCheckout.advancedCallbacks?.onError(error, createResultHandler());
      AdyenCheckout.performAutoCleanup();
    });
    AdyenCheckout.subscribeApplePayHandlers();

    await AdyenContext.setup(paymentMethods, configuration);
    const checkout = createCheckout(
      paymentMethods,
      configuration,
      (viewId) => AdyenCheckout.subscribe(viewId),
      (viewId) => AdyenCheckout.unsubscribe(viewId),
      () => AdyenCheckout.cleanup()
    );
    AdyenCheckout.activeCheckout = checkout;
    return checkout;
  }

  /**
   * Tears down the active checkout context, releasing all native resources.
   */
  static cleanup(): void {
    if (AdyenCheckout.isCleanedUp) return;
    // Unsubscribe all embedded views
    AdyenCheckout.subscriptions.forEach((listeners, viewId) => {
      listeners.forEach((s) => s.remove());
      AdyenComponentModule.unsubscribe(viewId);
    });
    AdyenCheckout.subscriptions.clear();
    // Remove native event listeners
    AdyenContext.removeAllListeners();
    AdyenContext.cleanup();
    // Clear state
    AdyenCheckout.configuration = null;
    AdyenCheckout.sessionCallbacks = null;
    AdyenCheckout.advancedCallbacks = null;
    AdyenCheckout.activeCheckout = null;
    AdyenCheckout.isCleanedUp = true;
    AdyenCheckout.eventHandlerRefs.config.current = null;
    AdyenCheckout.eventHandlerRefs.onSubmit.current = undefined;
    AdyenCheckout.eventHandlerRefs.onError.current = () => {};
    AdyenCheckout.eventHandlerRefs.onComplete.current = undefined;
    AdyenCheckout.eventHandlerRefs.onAdditionalDetails.current = undefined;
  }

  // --- Per-view subscription management (for <AdyenComponent>) ---

  private static subscribe(viewId: string): void {
    if (AdyenCheckout.subscriptions.has(viewId)) return;
    AdyenComponentModule.subscribe(viewId);
    const proxy = new ComponentProxy(AdyenComponentModule, viewId);
    const bag = startEventListeners(
      proxy,
      AdyenCheckout.eventHandlerRefs,
      viewId
    );
    AdyenCheckout.subscriptions.set(viewId, bag);
  }

  private static unsubscribe(viewId: string): void {
    const bag = AdyenCheckout.subscriptions.get(viewId);
    bag?.forEach((s) => s.remove());
    AdyenCheckout.subscriptions.delete(viewId);
    AdyenComponentModule.unsubscribe(viewId);
  }

  // --- Auto-cleanup on terminal callbacks ---

  private static performAutoCleanup(): void {
    AdyenCheckout.cleanup();
  }

  // --- Apple Pay handlers ---

  private static subscribeApplePayHandlers(): void {
    AdyenContext.assignApplePayAuthorizationHandler((payment) => {
      const provide = (result: ApplePayAuthorizationResult) =>
        AdyenContext.provideAuthorizationResult(result);
      const actions: ApplePayAuthorizationActions = {
        resolve: () => provide({ status: 'success' }),
        reject: (errors?) => provide({ status: 'failure', errors }),
      };
      const callback = AdyenCheckout.configuration?.applepay?.onAuthorize;
      if (callback) {
        callback(payment, actions);
      } else {
        actions.resolve();
      }
    });
    AdyenContext.assignApplePayShippingContactHandler((contact) => {
      const resolve = (update: ApplePayShippingContactUpdateRequest) =>
        AdyenContext.provideShippingContactUpdate(update);
      const callback =
        AdyenCheckout.configuration?.applepay?.onShippingContactChange;
      if (callback) {
        callback(contact, resolve);
      } else {
        resolve({});
      }
    });
    AdyenContext.assignApplePayShippingMethodHandler((shippingMethod) => {
      const resolve = (update: ApplePayShippingMethodUpdateRequest) =>
        AdyenContext.provideShippingMethodUpdate(update);
      const callback =
        AdyenCheckout.configuration?.applepay?.onShippingMethodChange;
      if (callback) {
        callback(shippingMethod, resolve);
      } else {
        resolve({});
      }
    });
    AdyenContext.assignApplePayCouponCodeHandler((data) => {
      const resolve = (update: ApplePayCouponCodeUpdateRequest) =>
        AdyenContext.provideCouponCodeUpdate(update);
      const callback =
        AdyenCheckout.configuration?.applepay?.onCouponCodeChange;
      if (callback) {
        callback(data.couponCode, resolve);
      } else {
        resolve({});
      }
    });
  }
}
