//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { describe, expect, jest, test } from '@jest/globals';

const mockSetSdkVersion = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    SessionHelper: {
      setSdkVersion: mockSetSdkVersion,
    },
  },
}));

describe('configureSDKVersion', () => {
  test('should configure the native SDK version', () => {
    const {
      configureSDKVersion,
    } = require('../../modules/base/configureSDKVersion');

    configureSDKVersion('2.0.0-local.1');

    expect(mockSetSdkVersion).toHaveBeenCalledWith('2.0.0-local.1');
  });
});
