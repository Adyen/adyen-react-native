//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  ApplePayAuthorizationActions,
  ApplePayAuthorizationResult,
  ApplePayCouponCodeUpdateRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethodUpdateRequest,
  Configuration,
} from '../../core';
import { NativeCheckout } from '../../modules/context/ContextModule';

/**
 * Bridges Apple Pay sheet callbacks to the merchant's configuration. Every callback is optional
 * and falls back to a neutral answer that lets the sheet proceed.
 * `configOf` is a function (not a value) since handlers outlive a single setup and configuration can be replaced.
 */
export function subscribeApplePayHandlers(
  configOf: () => Configuration | null
): void {
  NativeCheckout.assignApplePayAuthorizationHandler((payment) => {
    const provide = (result: ApplePayAuthorizationResult) =>
      NativeCheckout.provideAuthorizationResult(result);
    const actions: ApplePayAuthorizationActions = {
      resolve: () => provide({ status: 'success' }),
      reject: (errors?) => provide({ status: 'failure', errors }),
    };
    const callback = configOf()?.applepay?.onAuthorize;
    if (callback) {
      callback(payment, actions);
    } else {
      actions.resolve();
    }
  });

  NativeCheckout.assignApplePayShippingContactHandler((contact) => {
    const resolve = (update: ApplePayShippingContactUpdateRequest) =>
      NativeCheckout.provideShippingContactUpdate(update);
    const callback = configOf()?.applepay?.onShippingContactChange;
    if (callback) {
      callback(contact, resolve);
    } else {
      resolve({});
    }
  });

  NativeCheckout.assignApplePayShippingMethodHandler((shippingMethod) => {
    const resolve = (update: ApplePayShippingMethodUpdateRequest) =>
      NativeCheckout.provideShippingMethodUpdate(update);
    const callback = configOf()?.applepay?.onShippingMethodChange;
    if (callback) {
      callback(shippingMethod, resolve);
    } else {
      resolve({});
    }
  });

  NativeCheckout.assignApplePayCouponCodeHandler((data) => {
    const resolve = (update: ApplePayCouponCodeUpdateRequest) =>
      NativeCheckout.provideCouponCodeUpdate(update);
    const callback = configOf()?.applepay?.onCouponCodeChange;
    if (callback) {
      callback(data.couponCode, resolve);
    } else {
      resolve({});
    }
  });
}
