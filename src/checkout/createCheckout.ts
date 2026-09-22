//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { Checkout, Configuration, PaymentMethodsResponse } from '../core';
import { NativeCheckout } from '../modules/context/ContextModule';
import type { CheckoutHost } from './types';

const inactiveWarning = (method: string): string =>
  `AdyenCheckout: \`checkout.${method}()\` was ignored because this checkout is no longer active. ` +
  `Call AdyenCheckout.setup() or AdyenCheckout.setupAdvanced() to start a new checkout.`;

/**
 * Produces a {@link Checkout} bound to the shared checkout context; used by `setup()`/`setupAdvanced()`.
 * Kept out of `core` and the public barrel so a `Checkout` can only be obtained after setup resolves.
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
      isActive('isAvailable') ? NativeCheckout.isAvailable(type) : false,
    requiresUserInteraction: async (type: string) =>
      isActive('requiresUserInteraction')
        ? NativeCheckout.requiresUserInteraction(type)
        : false,
    submit: (type: string) => {
      if (isActive('submit')) {
        NativeCheckout.submit(type);
      }
    },
    // Idempotent by design — a repeated or late call is a silent no-op.
    invalidate: () => host.invalidate(),
  };
}
