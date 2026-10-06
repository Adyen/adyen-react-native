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
import {
  ResultCode,
  type ApplePayAuthorizationRequest,
  type ApplePayAuthorizationResult,
  type ApplePayCouponCodeRequest,
  type ApplePayCouponCodeResult,
  type ApplePayShippingContactRequest,
  type ApplePayShippingContactResult,
  type ApplePayShippingMethodRequest,
  type ApplePayShippingMethodResult,
  type SessionsResult,
} from '../core';

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

const sessionResult: SessionsResult = {
  sessionId: 'session-id',
  resultCode: ResultCode.authorised,
};

// @ts-expect-error Session terminal results always include the session ID.
const missingSessionId: SessionsResult = { resultCode: ResultCode.authorised };

export const sessionResultContract = [sessionResult, missingSessionId];

const applePayAuthorizationRequest: ApplePayAuthorizationRequest = {
  payment: {},
};
const applePayAuthorizationResult: ApplePayAuthorizationResult = {
  status: 'success',
};
const applePayShippingContactRequest: ApplePayShippingContactRequest = {
  contact: {},
};
const applePayShippingContactResult: ApplePayShippingContactResult = {};
const applePayShippingMethodRequest: ApplePayShippingMethodRequest = {
  shippingMethod: { label: 'Standard', amount: '5.00' },
};
const applePayShippingMethodResult: ApplePayShippingMethodResult = {};
const applePayCouponCodeRequest: ApplePayCouponCodeRequest = {
  couponCode: 'SAVE10',
};
const applePayCouponCodeResult: ApplePayCouponCodeResult = {};

export const applePayCallbackContract = [
  applePayAuthorizationRequest,
  applePayAuthorizationResult,
  applePayShippingContactRequest,
  applePayShippingContactResult,
  applePayShippingMethodRequest,
  applePayShippingMethodResult,
  applePayCouponCodeRequest,
  applePayCouponCodeResult,
];

type HasLegacyApplePayAuthorizationActions =
  'ApplePayAuthorizationActions' extends keyof typeof import('../core')
    ? true
    : false;
export const noLegacyApplePayAuthorizationActions: false =
  false as HasLegacyApplePayAuthorizationActions;

// Checkout descriptors are private bridge metadata, not configuration carriers.
// @ts-expect-error Removed configuration must not return from native setup.
export const removedConfiguration = checkout.configuration;

// Legacy fire-and-forget commands must not satisfy the generated protocol.
// @ts-expect-error submit is asynchronous.
export const legacySynchronousSubmit: void = checkoutModule.submit(
  checkout.checkoutId,
  storedTarget
);
