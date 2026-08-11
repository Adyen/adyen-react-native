//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { NativeModules } from 'react-native';

export function configureSDKVersion(sdkVersion: string) {
  NativeModules.AdyenContext?.setSdkVersion(sdkVersion);
}
