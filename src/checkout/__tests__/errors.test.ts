//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { describe, expect, test } from '@jest/globals';
import { asCheckoutError } from '../errors';

describe('public checkout error snapshots', () => {
  test.each([
    ['checkoutBusy', 'setup'],
    ['operationBusy', 'presentation'],
    ['staleCheckout', 'cleanup'],
    ['staleRequest', 'callback'],
    ['unsupportedCapability', 'presentation'],
    ['invalidConfiguration', 'setup'],
    ['invalidTarget', 'query'],
    ['cancelled', 'callback'],
  ] as const)('keeps the emitted %s/%s mapping portable', (code, phase) => {
    expect(
      asCheckoutError({
        code,
        phase,
        checkoutId: 'private-checkout-id',
        operationId: 'private-operation-id',
        message: 'NativeCheckout<private-checkout-id>',
      })
    ).toEqual({ code, phase });
  });
});
