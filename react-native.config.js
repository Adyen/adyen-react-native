//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

module.exports = {
  // React Native SwiftPM autolinking (react-native >= 0.87). The derived name for
  // '@adyen/react-native' would be React Native's reserved 'ReactNative', so the
  // name is pinned to the package and product declared in ios/Package.swift.
  spm: {
    name: 'AdyenReactNative',
  },
};
