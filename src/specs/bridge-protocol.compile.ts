//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  CheckoutDescriptor,
  CheckoutTarget,
  Spec as CheckoutSpec,
} from './NativeAdyenCheckout';

declare const checkout: CheckoutDescriptor;
declare const checkoutModule: CheckoutSpec;

const storedTarget: CheckoutTarget = {
  kind: 'storedPaymentMethod',
  id: 'stored-payment-method-id',
};

const query: Promise<boolean> = checkoutModule.isAvailable(
  checkout.checkoutId,
  storedTarget
);
const submit: Promise<void> = checkoutModule.submit(
  checkout.checkoutId,
  storedTarget
);
const invalidate: Promise<void> = checkoutModule.invalidate(
  checkout.checkoutId
);

export const compileContractPromises = [query, submit, invalidate];

// Checkout descriptors are private bridge metadata, not configuration carriers.
// @ts-expect-error Removed configuration must not return from native setup.
export const removedConfiguration = checkout.configuration;

// Legacy fire-and-forget commands must not satisfy the generated protocol.
// @ts-expect-error submit is asynchronous.
export const legacySynchronousSubmit: void = checkoutModule.submit(
  checkout.checkoutId,
  storedTarget
);
