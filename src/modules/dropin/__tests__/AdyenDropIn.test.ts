//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../../../specs/NativeAdyenCheckout', () => ({
  __esModule: true,
  default: { startDropIn: jest.fn() },
}));

jest.mock('../../../checkout/createCheckout', () => ({
  checkoutHandleFor: jest.fn(),
}));

import { AdyenDropIn } from '../AdyenDropIn';

const mockStartDropIn = require('../../../specs/NativeAdyenCheckout').default
  .startDropIn as jest.Mock;
const mockCheckoutHandleFor = require('../../../checkout/createCheckout')
  .checkoutHandleFor as jest.Mock;

describe('AdyenDropIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('forwards only the private checkout identity to the generated module', async () => {
    mockCheckoutHandleFor.mockReturnValueOnce({
      checkoutId: 'private-checkout-id',
      isActive: () => true,
    });
    mockStartDropIn.mockResolvedValueOnce(undefined);
    const checkout = {
      flow: 'advanced',
      paymentMethods: { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
    } as never;

    await expect(AdyenDropIn.start(checkout)).resolves.toBeUndefined();
    expect(mockStartDropIn).toHaveBeenCalledWith('private-checkout-id');
  });

  test('rejects a foreign checkout without calling native code', async () => {
    mockCheckoutHandleFor.mockReturnValueOnce(undefined);

    await expect(AdyenDropIn.start({} as never)).rejects.toEqual({
      code: 'staleCheckout',
      phase: 'presentation',
    });
    expect(mockStartDropIn).not.toHaveBeenCalled();
  });

  test('rejects an invalidated checkout without calling native code', async () => {
    mockCheckoutHandleFor.mockReturnValueOnce({
      checkoutId: 'stale-checkout-id',
      isActive: () => false,
    });

    await expect(AdyenDropIn.start({} as never)).rejects.toEqual({
      code: 'staleCheckout',
      phase: 'presentation',
    });
    expect(mockStartDropIn).not.toHaveBeenCalled();
  });

  test.each([
    ['unsupportedCapability', { code: 'unsupportedCapability' }],
    ['operationBusy', { code: 'operationBusy', phase: 'presentation' }],
  ])(
    'propagates %s native rejection through the start promise',
    async (_, error) => {
      mockCheckoutHandleFor.mockReturnValueOnce({
        checkoutId: 'private-checkout-id',
        isActive: () => true,
      });
      mockStartDropIn.mockRejectedValueOnce(error);

      await expect(AdyenDropIn.start({} as never)).rejects.toEqual({
        code: error.code,
        phase: 'presentation',
      });
    }
  );

  test('does not expose legacy Drop-in commands', () => {
    expect(AdyenDropIn).toEqual(
      expect.objectContaining({
        start: expect.any(Function),
      })
    );
    expect(Object.keys(AdyenDropIn)).toEqual(['start']);
  });
});
