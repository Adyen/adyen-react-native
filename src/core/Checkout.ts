//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { AdyenContext } from '../modules/context/ContextModule';
import type { Configuration } from './configurations/Configuration';
import type { PaymentMethodsResponse } from './types';

/**
 * The entry point for interacting with a configured checkout.
 *
 * A `Checkout` is only ever obtained by awaiting `AdyenCheckout.setup()` or
 * `AdyenCheckout.setupAdvanced()` — it has no public constructor. Because it
 * exists only after setup resolves, its methods cannot be called before the
 * checkout context is ready.
 */
export interface Checkout {
  /** Payment methods available for this checkout. */
  readonly paymentMethods: PaymentMethodsResponse;

  /** The checkout configuration. */
  readonly configuration: Configuration;

  /**
   * Checks whether a payment method type is available for the shopper.
   * @param type - The payment method type (e.g. "scheme", "googlepay", "applepay").
   */
  isAvailable(type: string): Promise<boolean>;

  /**
   * Reports whether the given payment method type needs to display UI before it
   * can be submitted.
   * @param type - The payment method type.
   */
  requiresUserInteraction(type: string): Promise<boolean>;

  /**
   * Submits the given payment method type without displaying UI (headless flow).
   * @param type - The payment method type.
   */
  submit(type: string): void;

  /**
   * Abandons this checkout and releases all native resources.
   *
   * Call this when the shopper leaves the payment flow without it reaching a
   * terminal callback (`onComplete` / `onError`) — for example when navigating
   * away from a checkout screen. Terminal callbacks already clean up
   * automatically, so `invalidate()` is only needed for abandoned flows.
   *
   * Idempotent: calling it more than once, or after the checkout has already
   * been torn down, does nothing. After invalidation this `Checkout` is no
   * longer active and its other methods are ignored.
   */
  invalidate(): void;

  /** @internal Used by AdyenComponent to subscribe a native view to the event bus. */
  subscribe(viewId: string): void;

  /** @internal Used by AdyenComponent to unsubscribe a native view from the event bus. */
  unsubscribe(viewId: string): void;
}

/**
 * @internal
 * Lifecycle operations a {@link Checkout} delegates to its owning `AdyenCheckout`.
 */
export interface CheckoutHost {
  /** Whether the checkout this handle belongs to is still the active one. */
  isActive(): boolean;
  subscribe(viewId: string): void;
  unsubscribe(viewId: string): void;
  invalidate(): void;
}

const inactiveWarning = (method: string): string =>
  `AdyenCheckout: \`checkout.${method}()\` was ignored because this checkout is no longer active. ` +
  `Call AdyenCheckout.setup() or AdyenCheckout.setupAdvanced() to start a new checkout.`;

/**
 * @internal
 * Produces a {@link Checkout} bound to the shared checkout context. This is the
 * only way a `Checkout` is created and is used by `setup()` / `setupAdvanced()`;
 * it is intentionally not part of the public barrel so that consumers can only
 * obtain a `Checkout` after setup resolves.
 */
export function createCheckout(
  paymentMethods: PaymentMethodsResponse,
  configuration: Configuration,
  host: CheckoutHost
): Checkout {
  /** Warns and reports `false` when the checkout has already been torn down. */
  const isActive = (method: string): boolean => {
    if (host.isActive()) {
      return true;
    }
    console.warn(inactiveWarning(method));
    return false;
  };

  return {
    paymentMethods,
    configuration,
    isAvailable: async (type: string) =>
      isActive('isAvailable') ? AdyenContext.isAvailable(type) : false,
    requiresUserInteraction: async (type: string) =>
      isActive('requiresUserInteraction')
        ? AdyenContext.requiresUserInteraction(type)
        : false,
    submit: (type: string) => {
      if (isActive('submit')) {
        AdyenContext.submit(type);
      }
    },
    // Idempotent by design — a repeated or late call is a silent no-op.
    invalidate: () => host.invalidate(),
    subscribe: (viewId: string) => {
      if (isActive('subscribe')) {
        host.subscribe(viewId);
      }
    },
    // Never guarded: views unsubscribe while tearing down, after the checkout
    // has already been cleaned up.
    unsubscribe: (viewId: string) => host.unsubscribe(viewId),
  };
}
