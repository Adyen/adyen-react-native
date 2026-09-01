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
import { AdyenContext } from '../modules/context/ContextModule';
import { AdyenDropIn } from '../modules/dropin/AdyenDropIn';
import { AdyenComponent as AdyenComponentModule } from '../modules/component/AdyenComponentModule';
import { ComponentProxy } from '../modules/component/ComponentProxy';
import {
  startDropInEventListeners,
  startEventListeners,
  type EventListenerTarget,
} from './utils/startEventListeners';
import { checkConfiguration } from './utils/checkConfiguration';
import { checkPaymentMethodsResponse } from './utils/checkPaymentMethodsResponse';
import { subscribeApplePayHandlers } from './utils/subscribeApplePayHandlers';
import { DROP_IN_KEY } from './constants';
import { createCheckout } from './createCheckout';
import {
  dispatchSubmitResult,
  resolveTarget,
  stripTag,
  viewIdOf,
  viewKey,
} from './presenters';
import type { CheckoutHost, CheckoutRuntime, EventHandlers } from './types';

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
 * // Auto-cleanup on terminal callbacks.
 * // Abandoning the flow without a terminal callback: checkout.invalidate()
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
    AdyenContext.removeAllListeners();
    AdyenCheckout.subscribeSessionTerminalHandlers(callbacks);
    AdyenCheckout.subscribeDropInHandlers();
    AdyenContext.assignBeforeSubmitHandler(async (data) => {
      const result =
        await AdyenCheckout.runtime.sessionCallbacks?.onBeforeSubmit?.(data);
      AdyenContext.provideBeforeSubmitResult(
        result ?? BeforeSubmitResult.proceed(data)
      );
    });
    subscribeApplePayHandlers(() => AdyenCheckout.runtime.configuration);

    const context = await AdyenContext.createSession(
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
    // Before re-setup, clear JS-side state without calling native cleanup.
    // The native side will handle its own state when it receives the new setup call.
    if (!AdyenCheckout.runtime.isCleanedUp) {
      AdyenCheckout.clearJSState();
    }

    // Validate both inputs before touching any state. The advanced flow is the only entry point
    // that receives payment methods from the merchant — in the session flow they come back from
    // native — so this is the only place the response can be wrong.
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
    AdyenContext.removeAllListeners();
    AdyenContext.assignSubmitHandler(async (raw) => {
      // The tag sits beside `paymentData`, so what the merchant receives is already clean.
      const target = resolveTarget(raw);
      const { paymentData } = raw;
      const payload = {
        ...paymentData,
        returnUrl: paymentData.returnUrl ?? configuration.returnUrl,
      };
      const result =
        await AdyenCheckout.runtime.advancedCallbacks?.onSubmit(payload);
      if (result) {
        dispatchSubmitResult(result, target);
      }
    });
    AdyenContext.assignAdditionalDetailsHandler(async (raw) => {
      const target = resolveTarget(raw);
      const result =
        await AdyenCheckout.runtime.advancedCallbacks?.onAdditionalDetails(
          stripTag(raw)
        );
      if (result) {
        target.completion(result.resultCode);
      }
    });
    // Terminal callbacks — no handler
    AdyenCheckout.subscribeAdvancedTerminalHandlers(callbacks);
    AdyenCheckout.subscribeDropInHandlers();
    subscribeApplePayHandlers(() => AdyenCheckout.runtime.configuration);

    await AdyenContext.setup(paymentMethods, configuration);
    const checkout = createCheckout(
      paymentMethods,
      configuration,
      AdyenCheckout.checkoutHost()
    );
    return checkout;
  }

  /**
   * Lifecycle operations handed to every {@link Checkout} produced by setup.
   * A handle is "active" until the checkout is torn down by a terminal event or
   * by `checkout.invalidate()`.
   */
  private static checkoutHost(): CheckoutHost {
    return {
      isActive: () => !AdyenCheckout.runtime.isCleanedUp,
      subscribe: (viewId) => AdyenCheckout.subscribe(viewId),
      unsubscribe: (viewId) => AdyenCheckout.unsubscribe(viewId),
      invalidate: () => AdyenCheckout.cleanup(),
    };
  }

  // Terminal payloads are stripped too: Drop-in emits them through a tagged bus, so the tag would
  // otherwise surface in the result object handed to the merchant.

  private static subscribeSessionTerminalHandlers(
    callbacks: SessionCallbacks
  ): void {
    AdyenContext.assignCompletionHandler((result) => {
      AdyenCheckout.handleTerminalEvent(() =>
        callbacks.onComplete(stripTag(result))
      );
    });
    AdyenContext.assignErrorHandler((error) => {
      AdyenCheckout.handleTerminalEvent(() =>
        callbacks.onError(stripTag(error))
      );
    });
  }

  private static subscribeAdvancedTerminalHandlers(
    callbacks: AdvancedCallbacks
  ): void {
    AdyenContext.assignAdvancedCompleteHandler((result) => {
      AdyenCheckout.handleTerminalEvent(() =>
        callbacks.onComplete(stripTag(result))
      );
    });
    AdyenContext.assignAdvancedErrorHandler((error) => {
      AdyenCheckout.handleTerminalEvent(() =>
        callbacks.onError(stripTag(error))
      );
    });
  }

  /**
   * Subscribes the event families only Drop-in emits: stored-payment removal, partial payments
   * and address lookup.
   *
   * Core events are excluded on purpose - those arrive on the context listeners and are routed by
   * presenter tag, so subscribing them here too would invoke merchant callbacks twice.
   */
  private static subscribeDropInHandlers(): void {
    // Replace rather than accumulate, so a re-setup cannot leave two bags listening.
    AdyenCheckout.runtime.subscriptions
      .get(DROP_IN_KEY)
      ?.forEach((s) => s.remove());
    // AdyenDropIn is declared as DropInModule, its public contract, but is a DropInWrapper at
    // runtime and so carries the event-listener members this needs.
    AdyenCheckout.runtime.subscriptions.set(
      DROP_IN_KEY,
      startDropInEventListeners(
        AdyenDropIn as unknown as EventListenerTarget,
        AdyenCheckout.runtime.eventHandlerRefs
      )
    );
  }

  /**
   * Points the per-view event handler refs at the active callbacks, replacing all four at once.
   *
   * Refs rather than direct wiring because `startEventListeners` reads them at event time, so a
   * view subscribed before a re-setup picks up the new callbacks without resubscribing. Omitting a
   * handler clears it, which is both how a flow declares it does not handle an event and how
   * teardown clears everything.
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
    // Tear down every presenter's listeners. Only embedded views also have a native
    // subscription to detach; Drop-in's bag is JS-only.
    AdyenCheckout.runtime.subscriptions.forEach((listeners, key) => {
      listeners.forEach((s) => s.remove());
      const viewId = viewIdOf(key);
      if (viewId !== undefined) {
        AdyenComponentModule.unsubscribe(viewId);
      }
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
    // Suppress any terminal event still queued for the checkout being torn down.
    AdyenCheckout.runtime.hasHandledTerminalEvent = true;
    AdyenCheckout.runtime.eventHandlerRefs.config.current = null;
    AdyenCheckout.wireEventHandlerRefs();
  }

  // --- Per-view subscription management (for <AdyenComponent>) ---

  private static subscribe(viewId: string): void {
    const key = viewKey(viewId);
    if (AdyenCheckout.runtime.subscriptions.has(key)) return;
    AdyenComponentModule.subscribe(viewId);
    const proxy = new ComponentProxy(AdyenComponentModule, viewId);
    const bag = startEventListeners(
      proxy,
      AdyenCheckout.runtime.eventHandlerRefs,
      viewId
    );
    AdyenCheckout.runtime.subscriptions.set(key, bag);
  }

  private static unsubscribe(viewId: string): void {
    const key = viewKey(viewId);
    AdyenCheckout.runtime.subscriptions.get(key)?.forEach((s) => s.remove());
    AdyenCheckout.runtime.subscriptions.delete(key);
    AdyenComponentModule.unsubscribe(viewId);
  }

  // --- Auto-cleanup on terminal callbacks ---

  private static performAutoCleanup(): void {
    AdyenCheckout.cleanup();
  }
}
