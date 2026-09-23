//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { describe, expect, jest, test } from '@jest/globals';

jest.mock('../../specs/NativeAdyenCheckout', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn(),
    requiresUserInteraction: jest.fn(),
    submit: jest.fn(),
    invalidate: jest.fn(),
  },
}));

import { createCheckout } from '../createCheckout';

const mockNativeCheckout = require('../../specs/NativeAdyenCheckout')
  .default as {
  isAvailable: jest.Mock;
  requiresUserInteraction: jest.Mock;
  submit: jest.Mock;
  invalidate: jest.Mock;
};

const descriptor = {
  checkoutId: 'checkout-private-id',
  flow: 'advanced' as const,
  paymentMethodsJson: '{}',
};

describe('createCheckout', () => {
  test('forwards private identity and a stored-method target unchanged', async () => {
    mockNativeCheckout.isAvailable.mockResolvedValue(true);
    const checkout = createCheckout(
      descriptor,
      { paymentMethods: [] },
      {},
      { onInvalidated: jest.fn() }
    ).publicHandle;

    await expect(
      checkout.isAvailable({ kind: 'storedPaymentMethod', id: 'stored-123' })
    ).resolves.toBe(true);
    expect(mockNativeCheckout.isAvailable).toHaveBeenCalledWith(
      'checkout-private-id',
      { kind: 'storedPaymentMethod', id: 'stored-123' }
    );
  });

  test('rejects malformed targets and stale commands asynchronously', async () => {
    const checkout = createCheckout(
      descriptor,
      { paymentMethods: [] },
      {},
      { onInvalidated: jest.fn() }
    );

    await expect(
      checkout.publicHandle.submit({} as never)
    ).rejects.toMatchObject({ code: 'invalidTarget', phase: 'presentation' });
    checkout.markStale();
    await expect(
      checkout.publicHandle.submit({ kind: 'paymentMethod', type: 'scheme' })
    ).rejects.toMatchObject({ code: 'staleCheckout', phase: 'presentation' });
  });

  test('invalidates once and never converts cleanup into a listener operation', async () => {
    mockNativeCheckout.invalidate.mockResolvedValue(undefined);
    const onInvalidated = jest.fn();
    const checkout = createCheckout(
      descriptor,
      { paymentMethods: [] },
      {},
      { onInvalidated }
    ).publicHandle;

    await checkout.invalidate();
    await checkout.invalidate();
    expect(mockNativeCheckout.invalidate).toHaveBeenCalledTimes(1);
    expect(onInvalidated).toHaveBeenCalledTimes(1);
  });
});
