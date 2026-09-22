//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  AdvancedCallbacks,
  Checkout,
  Configuration,
  PaymentMethodsResponse,
  SessionCallbacks,
  SessionConfiguration,
} from '../core';
import { BeforeSubmitResult } from '../core';
import { NativeCheckout } from '../modules/context/ContextModule';
import { AdyenDropIn } from '../modules/dropin/AdyenDropIn';
import {
  startDropInEventListeners,
  type EventListenerTarget,
} from './utils/startEventListeners';
import { checkConfiguration } from './utils/checkConfiguration';
import { checkPaymentMethodsResponse } from './utils/checkPaymentMethodsResponse';
import { subscribeApplePayHandlers } from './utils/subscribeApplePayHandlers';
import { DROP_IN_KEY } from './constants';
import { createCheckout } from './createCheckout';
import type { CheckoutHost, CheckoutRuntime, EventHandlers } from './types';
import type { SubmitResult } from '../core';

/** Sends a {@link SubmitResult} back to the suspended native callback awaiting it. */
function dispatchSubmitResult(result: SubmitResult): void {
  switch (result.type) {
    case 'action':
      NativeCheckout.action(result.action);
      break;
    case 'completed':
      NativeCheckout.completion(result.resultCode);
      break;
    case 'retry':
      NativeCheckout.retry(result.message);
      break;
  }
}

/**
 * Static entry point for the Adyen checkout. Auto-cleans native resources on terminal callbacks.
 *
 * @example
 * ```tsx
 * const checkout = await AdyenCheckout.setup(session, config, callbacks);
 * AdyenDropIn.start(checkout);
 * // or
 * <AdyenComponent checkout={checkout} type="scheme" />
 * // If abandoning without a terminal callback: checkout.invalidate()
 * ```
 */
export class AdyenCheckout {
  private static readonly runtime: CheckoutRuntime = {
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

  /** Sets up a session-based checkout flow; returns a {@link Checkout} for Drop-in or embedded components. */
  static async setup(
    session: SessionConfiguration,
    configuration: Configuration,
    callbacks: SessionCallbacks
  ): Promise<Checkout> {
    // Before re-setup, clear JS-side state; native handles its own state on the new setup call.
    if (!AdyenCheckout.runtime.isCleanedUp) {
      AdyenCheckout.clearJSState();
    }

    checkConfiguration(configuration);
    AdyenCheckout.runtime.configuration = configuration;
    AdyenCheckout.runtime.sessionCallbacks = callbacks;
    AdyenCheckout.runtime.advancedCallbacks = null;
    AdyenCheckout.runtime.isCleanedUp = false;
    AdyenCheckout.runtime.hasHandledTerminalEvent = false;
    AdyenCheckout.runtime.eventHandlerRefs.config.current = configuration;

    // Session flow: the SDK owns submit and additional details, so those stay unhandled here.
    AdyenCheckout.wireEventHandlerRefs({
      onComplete: (result) =>
        AdyenCheckout.runtime.sessionCallbacks?.onComplete(result),
      onError: (error) =>
        AdyenCheckout.runtime.sessionCallbacks?.onError(error),
    });

    // Wire native event listeners
    // Terminal callbacks — no handler parameter
    NativeCheckout.removeAllListeners();
    AdyenCheckout.subscribeSessionTerminalHandlers(callbacks);
    AdyenCheckout.subscribeCardHandlers();
    AdyenCheckout.subscribeDropInHandlers();
    NativeCheckout.assignBeforeSubmitHandler(async (data) => {
      const result =
        await AdyenCheckout.runtime.sessionCallbacks?.onBeforeSubmit?.(data);
      NativeCheckout.provideBeforeSubmitResult(
        result ?? BeforeSubmitResult.proceed(data)
      );
    });
    subscribeApplePayHandlers(() => AdyenCheckout.runtime.configuration);

    const context = await NativeCheckout.createSession(
      { id: session.id, sessionData: session.sessionData },
      configuration
    );
    const checkout = createCheckout(
      context.paymentMethods,
      configuration,
      AdyenCheckout.checkoutHost()
    );
    return checkout;
  }

  /** Sets up an advanced (merchant-managed) checkout flow; returns a {@link Checkout} for Drop-in or embedded components. */
  static async setupAdvanced(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration,
    callbacks: AdvancedCallbacks
  ): Promise<Checkout> {
    // Before re-setup, clear JS-side state; native handles its own state on the new setup call.
    if (!AdyenCheckout.runtime.isCleanedUp) {
      AdyenCheckout.clearJSState();
    }

    // Advanced flow is the only entry point receiving payment methods from the merchant, so validate here.
    checkConfiguration(configuration);
    checkPaymentMethodsResponse(paymentMethods);
    AdyenCheckout.runtime.configuration = configuration;
    AdyenCheckout.runtime.advancedCallbacks = callbacks;
    AdyenCheckout.runtime.sessionCallbacks = null;
    AdyenCheckout.runtime.isCleanedUp = false;
    AdyenCheckout.runtime.hasHandledTerminalEvent = false;
    AdyenCheckout.runtime.eventHandlerRefs.config.current = configuration;

    // Advanced flow: the merchant handles every event, returning results for the intermediate ones.
    AdyenCheckout.wireEventHandlerRefs({
      onSubmit: (data) =>
        AdyenCheckout.runtime.advancedCallbacks?.onSubmit(data),
      onAdditionalDetails: (data) =>
        AdyenCheckout.runtime.advancedCallbacks?.onAdditionalDetails(data),
      onComplete: (result) =>
        AdyenCheckout.runtime.advancedCallbacks?.onComplete(result),
      onError: (error) =>
        AdyenCheckout.runtime.advancedCallbacks?.onError(error),
    });

    // Wire native event listeners
    // Intermediate callbacks — return-based
    NativeCheckout.removeAllListeners();
    NativeCheckout.assignSubmitHandler(async ({ paymentData }) => {
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
    NativeCheckout.assignAdditionalDetailsHandler(async (data) => {
      const result =
        await AdyenCheckout.runtime.advancedCallbacks?.onAdditionalDetails(
          data
        );
      if (result) {
        NativeCheckout.completion(result.resultCode);
      }
    });
    // Terminal callbacks — no handler
    AdyenCheckout.subscribeAdvancedTerminalHandlers(callbacks);
    AdyenCheckout.subscribeCardHandlers();
    AdyenCheckout.subscribeDropInHandlers();
    subscribeApplePayHandlers(() => AdyenCheckout.runtime.configuration);

    await NativeCheckout.setup(paymentMethods, configuration);
    const checkout = createCheckout(
      paymentMethods,
      configuration,
      AdyenCheckout.checkoutHost()
    );
    return checkout;
  }

  /** Lifecycle operations handed to every {@link Checkout} produced by setup. */
  private static checkoutHost(): CheckoutHost {
    return {
      isActive: () => !AdyenCheckout.runtime.isCleanedUp,
      invalidate: () => AdyenCheckout.cleanup(),
    };
  }

  /** Subscribes card config callbacks (BIN lookup/value); shared by Drop-in, embedded views, headless submit. */
  private static subscribeCardHandlers(): void {
    const refs = AdyenCheckout.runtime.eventHandlerRefs;
    NativeCheckout.assignBinLookupHandler((data) =>
      refs.config.current?.card?.onBinLookup?.(data)
    );
    NativeCheckout.assignBinValueHandler((value) =>
      refs.config.current?.card?.onBinValue?.(value)
    );
  }

  private static subscribeSessionTerminalHandlers(
    callbacks: SessionCallbacks
  ): void {
    NativeCheckout.assignCompletionHandler((result) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onComplete(result));
    });
    NativeCheckout.assignErrorHandler((error) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onError(error));
    });
  }

  private static subscribeAdvancedTerminalHandlers(
    callbacks: AdvancedCallbacks
  ): void {
    NativeCheckout.assignAdvancedCompleteHandler((result) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onComplete(result));
    });
    NativeCheckout.assignAdvancedErrorHandler((error) => {
      AdyenCheckout.handleTerminalEvent(() => callbacks.onError(error));
    });
  }

  /**
   * Subscribes Drop-in-only events (stored-payment removal, partial payments, address lookup).
   * Core events are excluded — those arrive via context listeners to avoid double invocation.
   */
  private static subscribeDropInHandlers(): void {
    // Replace rather than accumulate, so a re-setup cannot leave two bags listening.
    AdyenCheckout.runtime.subscriptions
      .get(DROP_IN_KEY)
      ?.forEach((s) => s.remove());
    // AdyenDropIn is typed as DropInModule but is a DropInWrapper at runtime with these listener members.
    AdyenCheckout.runtime.subscriptions.set(
      DROP_IN_KEY,
      startDropInEventListeners(
        AdyenDropIn as unknown as EventListenerTarget,
        AdyenCheckout.runtime.eventHandlerRefs
      )
    );
  }

  /**
   * Points the per-view event handler refs at the active callbacks. Uses refs (read at event
   * time) so a view subscribed before a re-setup picks up new callbacks without resubscribing.
   */
  private static wireEventHandlerRefs(handlers: EventHandlers = {}): void {
    const refs = AdyenCheckout.runtime.eventHandlerRefs;
    refs.onSubmit.current = handlers.onSubmit;
    refs.onAdditionalDetails.current = handlers.onAdditionalDetails;
    refs.onComplete.current = handlers.onComplete;
    refs.onError.current = handlers.onError;
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

  /** Clears JS-side state without native cleanup; used on re-setup so native manages its own transition. */
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
    AdyenCheckout.runtime.subscriptions.forEach((listeners) =>
      listeners.forEach((s) => s.remove())
    );
    AdyenCheckout.runtime.subscriptions.clear();
    // Remove native event listeners
    NativeCheckout.removeAllListeners();
    if (cleanupNativeContext) {
      NativeCheckout.cleanup();
    }
    // Clear state
    AdyenCheckout.runtime.configuration = null;
    AdyenCheckout.runtime.sessionCallbacks = null;
    AdyenCheckout.runtime.advancedCallbacks = null;
    AdyenCheckout.runtime.isCleanedUp = true;
    // Suppress any terminal event still queued for the checkout being torn down.
    AdyenCheckout.runtime.hasHandledTerminalEvent = true;
    AdyenCheckout.runtime.eventHandlerRefs.config.current = null;
    AdyenCheckout.wireEventHandlerRefs();
  }

  // --- Auto-cleanup on terminal callbacks ---

  private static performAutoCleanup(): void {
    AdyenCheckout.cleanup();
  }
}
