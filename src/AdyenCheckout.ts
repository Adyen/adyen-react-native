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
  SessionCallbacks,
  SessionConfiguration,
  SubmitResult,
} from './core';
import { BeforeSubmitResult } from './core';
import { createCheckout } from './core/Checkout';
import { AdyenContext } from './modules/context/ContextModule';
import { AdyenDropIn } from './modules/dropin/AdyenDropIn';
import { AdyenComponent as AdyenComponentModule } from './modules/component/AdyenComponentModule';
import { ComponentProxy } from './modules/component/ComponentProxy';
import {
  startEventListeners,
  type EventHandlerRefs,
} from './components/utils/startEventListeners';
import { checkConfiguration } from './components/utils/checkConfiguration';

/**
 * Dispatch a {@link SubmitResult} to the Drop-in native module.
 */
function dispatchSubmitResult(result: SubmitResult): void {
  switch (result.type) {
    case 'action':
      AdyenDropIn.action(result.action);
      break;
    case 'completed':
      AdyenDropIn.completion(result.resultCode);
      break;
    case 'retry':
      AdyenDropIn.retry(result.message);
      break;
  }
}

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
  private static readonly runtime: {
    configuration: Configuration | null;
    sessionCallbacks: SessionCallbacks | null;
    advancedCallbacks: AdvancedCallbacks | null;
    subscriptions: Map<string, EmitterSubscription[]>;
    isCleanedUp: boolean;
    hasHandledTerminalEvent: boolean;
    eventHandlerRefs: EventHandlerRefs;
  } = {
    configuration: null,
    sessionCallbacks: null,
    advancedCallbacks: null,
    subscriptions: new Map(),
    isCleanedUp: true,
    hasHandledTerminalEvent: false,
    eventHandlerRefs: {
      onSubmit: { current: undefined },
      onError: { current: undefined },
      onComplete: { current: undefined },
      onAdditionalDetails: { current: undefined },
      config: { current: null },
    },
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
    AdyenCheckout.runtime.hasHandledTerminalEvent = false;
    // Before re-setup, clear JS-side state without calling native cleanup.
    // The native side will handle its own state when it receives the new setup call.
    if (!AdyenCheckout.runtime.isCleanedUp) {
      AdyenCheckout.clearJSState();
    }

    checkConfiguration(configuration);
    AdyenCheckout.runtime.configuration = configuration;
    AdyenCheckout.runtime.sessionCallbacks = callbacks;
    AdyenCheckout.runtime.advancedCallbacks = null;
    AdyenCheckout.runtime.isCleanedUp = false;
    AdyenCheckout.runtime.eventHandlerRefs.config.current = configuration;

    // Wire event handler refs for per-view routing
    // Session flow — terminal callbacks without handler
    AdyenCheckout.runtime.eventHandlerRefs.onSubmit.current = undefined;
    AdyenCheckout.runtime.eventHandlerRefs.onAdditionalDetails.current =
      undefined;
    AdyenCheckout.runtime.eventHandlerRefs.onComplete.current = (result) =>
      AdyenCheckout.runtime.sessionCallbacks?.onComplete(result);
    AdyenCheckout.runtime.eventHandlerRefs.onError.current = (error) => {
      AdyenCheckout.runtime.sessionCallbacks?.onError(error);
    };

    // Wire native event listeners
    // Terminal callbacks — no handler parameter
    AdyenContext.removeAllListeners();
    AdyenCheckout.subscribeSessionTerminalHandlers(callbacks);
    AdyenContext.assignBeforeSubmitHandler(async (data) => {
      const result =
        await AdyenCheckout.runtime.sessionCallbacks?.onBeforeSubmit?.(data);
      AdyenContext.provideBeforeSubmitResult(
        result ?? BeforeSubmitResult.proceed(data)
      );
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
      (viewId) => AdyenCheckout.unsubscribe(viewId)
    );
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
    AdyenCheckout.runtime.hasHandledTerminalEvent = false;
    // Before re-setup, clear JS-side state without calling native cleanup.
    // The native side will handle its own state when it receives the new setup call.
    if (!AdyenCheckout.runtime.isCleanedUp) {
      AdyenCheckout.clearJSState();
    }

    checkConfiguration(configuration);
    AdyenCheckout.runtime.configuration = configuration;
    AdyenCheckout.runtime.advancedCallbacks = callbacks;
    AdyenCheckout.runtime.sessionCallbacks = null;
    AdyenCheckout.runtime.isCleanedUp = false;
    AdyenCheckout.runtime.eventHandlerRefs.config.current = configuration;

    // Wire event handler refs for per-view routing
    // Advanced flow — return-based intermediate, terminal without handler
    AdyenCheckout.runtime.eventHandlerRefs.onSubmit.current = (data) =>
      AdyenCheckout.runtime.advancedCallbacks?.onSubmit(data);
    AdyenCheckout.runtime.eventHandlerRefs.onAdditionalDetails.current = (
      data
    ) => AdyenCheckout.runtime.advancedCallbacks?.onAdditionalDetails(data);
    AdyenCheckout.runtime.eventHandlerRefs.onComplete.current = (result) =>
      AdyenCheckout.runtime.advancedCallbacks?.onComplete(result);
    AdyenCheckout.runtime.eventHandlerRefs.onError.current = (error) => {
      AdyenCheckout.runtime.advancedCallbacks?.onError(error);
    };

    // Wire native event listeners
    // Intermediate callbacks — return-based
    AdyenContext.removeAllListeners();
    AdyenContext.assignSubmitHandler(async ({ paymentData }) => {
      const payload = {
        ...paymentData,
        returnUrl: paymentData.returnUrl ?? configuration.returnUrl,
      };
      const result =
        await AdyenCheckout.runtime.advancedCallbacks?.onSubmit(payload);
      if (result) {
        dispatchSubmitResult(result);
      }
    });
    AdyenContext.assignAdditionalDetailsHandler(async (data) => {
      const result =
        await AdyenCheckout.runtime.advancedCallbacks?.onAdditionalDetails(
          data
        );
      if (result) {
        AdyenDropIn.completion(result.resultCode);
      }
    });
    // Terminal callbacks — no handler
    AdyenCheckout.subscribeAdvancedTerminalHandlers(callbacks);
    AdyenCheckout.subscribeApplePayHandlers();

    await AdyenContext.setup(paymentMethods, configuration);
    const checkout = createCheckout(
      paymentMethods,
      configuration,
      (viewId) => AdyenCheckout.subscribe(viewId),
      (viewId) => AdyenCheckout.unsubscribe(viewId)
    );
    return checkout;
  }

  private static subscribeSessionTerminalHandlers(
    callbacks: SessionCallbacks
  ): void {
    AdyenContext.assignCompletionHandler((result) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onComplete(result));
    });
    AdyenContext.assignErrorHandler((error) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onError(error));
    });
  }

  private static subscribeAdvancedTerminalHandlers(
    callbacks: AdvancedCallbacks
  ): void {
    AdyenContext.assignAdvancedCompleteHandler((result) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onComplete(result));
    });
    AdyenContext.assignAdvancedErrorHandler((error) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onError(error));
    });
  }

  private static handleTerminalEvent(callback: () => void): void {
    if (AdyenCheckout.runtime.hasHandledTerminalEvent) {
      return;
    }
    AdyenCheckout.runtime.hasHandledTerminalEvent = true;
    try {
      callback();
    } finally {
      AdyenCheckout.performAutoCleanup();
    }
  }

  /**
   * Clears JS-side state (listeners, subscriptions, callback refs) without
   * calling native cleanup. Used on re-setup so the native side can manage
   * its own state transition when it receives the new setup call.
   */
  private static clearJSState(): void {
    AdyenCheckout.resetState(false);
  }

  /**
   * Tears down the active checkout context, releasing all native resources.
   * Called only from terminal callbacks (onComplete / onError) via performAutoCleanup().
   */
  private static cleanup(): void {
    if (AdyenCheckout.runtime.isCleanedUp) return;
    AdyenCheckout.resetState(true);
  }

  private static resetState(cleanupNativeContext: boolean): void {
    // Unsubscribe all embedded views
    AdyenCheckout.runtime.subscriptions.forEach((listeners, viewId) => {
      listeners.forEach((s) => s.remove());
      AdyenComponentModule.unsubscribe(viewId);
    });
    AdyenCheckout.runtime.subscriptions.clear();
    // Remove native event listeners
    AdyenContext.removeAllListeners();
    if (cleanupNativeContext) {
      AdyenContext.cleanup();
    }
    // Clear state
    AdyenCheckout.runtime.configuration = null;
    AdyenCheckout.runtime.sessionCallbacks = null;
    AdyenCheckout.runtime.advancedCallbacks = null;
    AdyenCheckout.runtime.isCleanedUp = true;
    AdyenCheckout.runtime.eventHandlerRefs.config.current = null;
    AdyenCheckout.runtime.eventHandlerRefs.onSubmit.current = undefined;
    AdyenCheckout.runtime.eventHandlerRefs.onError.current = undefined;
    AdyenCheckout.runtime.eventHandlerRefs.onComplete.current = undefined;
    AdyenCheckout.runtime.eventHandlerRefs.onAdditionalDetails.current =
      undefined;
  }

  // --- Per-view subscription management (for <AdyenComponent>) ---

  private static subscribe(viewId: string): void {
    if (AdyenCheckout.runtime.subscriptions.has(viewId)) return;
    AdyenComponentModule.subscribe(viewId);
    const proxy = new ComponentProxy(AdyenComponentModule, viewId);
    const bag = startEventListeners(
      proxy,
      AdyenCheckout.runtime.eventHandlerRefs,
      viewId
    );
    AdyenCheckout.runtime.subscriptions.set(viewId, bag);
  }

  private static unsubscribe(viewId: string): void {
    const bag = AdyenCheckout.runtime.subscriptions.get(viewId);
    bag?.forEach((s) => s.remove());
    AdyenCheckout.runtime.subscriptions.delete(viewId);
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
      const callback =
        AdyenCheckout.runtime.configuration?.applepay?.onAuthorize;
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
        AdyenCheckout.runtime.configuration?.applepay?.onShippingContactChange;
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
        AdyenCheckout.runtime.configuration?.applepay?.onShippingMethodChange;
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
        AdyenCheckout.runtime.configuration?.applepay?.onCouponCodeChange;
      if (callback) {
        callback(data.couponCode, resolve);
      } else {
        resolve({});
      }
    });
  }
}
