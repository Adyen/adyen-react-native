//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { CheckoutHandle } from './createCheckout';

/** Internal lifecycle hooks. Merchant handles never expose checkout identities. */
export interface CheckoutLifecycle {
  onInvalidated(checkout: CheckoutHandle): void;
}
