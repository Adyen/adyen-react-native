//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { Checkout, Configuration, PaymentMethodsResponse } from '../core';
import { AdyenContext } from '../modules/context/ContextModule';
import type { CheckoutHost } from './types';

const inactiveWarning = (method: string): string =>
  `AdyenCheckout: \`checkout.${method}()\` was ignored because this checkout is no longer active. ` +
  `Call AdyenCheckout.setup() or AdyenCheckout.setupAdvanced() to start a new checkout.`;

/**
 * Produces a {@link Checkout} bound to the shared checkout context.
 *
 * This is the only way a `Checkout` is created, and it is used by `setup()` / `setupAdvanced()`.
 * It lives here rather than beside the `Checkout` interface so that `core` stays a leaf of pure
 * contracts: this factory reaches into `modules` at runtime, and it is deliberately absent from
 * the public barrel so consumers can only obtain a `Checkout` after setup resolves.
 *
 * The handle is per-setup and disposable, unlike the process-wide `AdyenCheckout` that owns it.
 * Once its owner is torn down, every method except `unsubscribe` becomes an ignored no-op.
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
