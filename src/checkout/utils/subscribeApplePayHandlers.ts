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
import { AdyenContext } from '../../modules/context/ContextModule';

/**
 * Bridges the Apple Pay sheet callbacks to the merchant's configuration.
 *
 * Apple Pay is configured rather than presented: the v6 SDK exposes `async` closures on
 * `ApplePayConfiguration`, and iOS `ContextModule` suspends each one until JS answers through the
 * matching `provide…` method. Every callback is optional, so each one falls back to the neutral
 * answer that lets the sheet proceed.
 *
 * Unlike the payment events, these are owned solely by `ContextModule` and need no presenter tag —
 * no other module can be awaiting them.
 *
 * @param configOf - Reads the active configuration. A function rather than a value because the
 *   handlers outlive a single setup, and a re-setup replaces the configuration underneath them.
 */
export function subscribeApplePayHandlers(
  configOf: () => Configuration | null
): void {
  AdyenContext.assignApplePayAuthorizationHandler((payment) => {
    const provide = (result: ApplePayAuthorizationResult) =>
      AdyenContext.provideAuthorizationResult(result);
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

  AdyenContext.assignApplePayShippingContactHandler((contact) => {
    const resolve = (update: ApplePayShippingContactUpdateRequest) =>
      AdyenContext.provideShippingContactUpdate(update);
    const callback = configOf()?.applepay?.onShippingContactChange;
    if (callback) {
      callback(contact, resolve);
    } else {
      resolve({});
    }
  });

  AdyenContext.assignApplePayShippingMethodHandler((shippingMethod) => {
    const resolve = (update: ApplePayShippingMethodUpdateRequest) =>
      AdyenContext.provideShippingMethodUpdate(update);
    const callback = configOf()?.applepay?.onShippingMethodChange;
    if (callback) {
      callback(shippingMethod, resolve);
    } else {
      resolve({});
    }
  });

  AdyenContext.assignApplePayCouponCodeHandler((data) => {
    const resolve = (update: ApplePayCouponCodeUpdateRequest) =>
      AdyenContext.provideCouponCodeUpdate(update);
    const callback = configOf()?.applepay?.onCouponCodeChange;
    if (callback) {
      callback(data.couponCode, resolve);
    } else {
      resolve({});
    }
  });
}
