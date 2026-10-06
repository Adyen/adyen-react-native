//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import NativeCheckout from '../../specs/NativeAdyenCheckout';

export function configureSDKVersion(sdkVersion: string) {
  NativeCheckout.setSdkVersion(sdkVersion);
}
