//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { AdyenContext } from '../modules/context/ContextModule';
import type { PaymentMethodsResponse } from './types';

/**
 * The entry point for interacting with a configured checkout.
 *
 * A `Checkout` is only ever obtained by awaiting `setup()` or `setupAdvanced()`
 * from `useAdyenCheckout` — it has no public constructor. Because it exists only
 * after setup resolves, its methods cannot be called before the checkout context
 * is ready.
 */
export interface Checkout {
  /** Payment methods available for this checkout. */
  readonly paymentMethods: PaymentMethodsResponse;

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
}

/**
 * @internal
 * Produces a {@link Checkout} bound to the shared checkout context. This is the
 * only way a `Checkout` is created and is used by `setup()` / `setupAdvanced()`;
 * it is intentionally not part of the public barrel so that consumers can only
 * obtain a `Checkout` after setup resolves.
 */
export function createCheckout(
  paymentMethods: PaymentMethodsResponse
): Checkout {
  return {
    paymentMethods,
    isAvailable: (type: string) => AdyenContext.isAvailable(type),
    requiresUserInteraction: (type: string) =>
      AdyenContext.requiresUserInteraction(type),
    submit: (type: string) => AdyenContext.submit(type),
  };
}
