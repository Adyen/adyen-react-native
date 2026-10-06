//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('forwards private identity and a stored-method target unchanged', async () => {
    mockNativeCheckout.isAvailable.mockResolvedValue(true);
    const checkout = createCheckout(
      descriptor,
      {
        paymentMethods: [],
        storedPaymentMethods: [{ id: 'stored-123', type: 'scheme' }],
      },
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

  test.each([
    {
      target: { kind: 'paymentMethod' as const, type: 'scheme' },
      available: true,
      interaction: false,
    },
    {
      target: { kind: 'storedPaymentMethod' as const, id: 'stored-one' },
      available: true,
      interaction: true,
    },
    {
      target: { kind: 'storedPaymentMethod' as const, id: 'stored-two' },
      available: false,
      interaction: false,
    },
  ])(
    'forwards the exact canonical target discriminant without using same-type ordering: %j',
    async ({ target, available, interaction }) => {
      mockNativeCheckout.isAvailable.mockResolvedValueOnce(available);
      mockNativeCheckout.requiresUserInteraction.mockResolvedValueOnce(
        interaction
      );
      mockNativeCheckout.submit.mockResolvedValueOnce(undefined);
      const checkout = createCheckout(
        descriptor,
        {
          paymentMethods: [{ type: 'scheme', name: 'Card' }],
          storedPaymentMethods: [
            { id: 'stored-one', type: 'scheme' },
            { id: 'stored-two', type: 'scheme' },
          ],
        },
        {},
        { onInvalidated: jest.fn() }
      ).publicHandle;

      await expect(checkout.isAvailable(target)).resolves.toBe(available);
      await expect(checkout.requiresUserInteraction(target)).resolves.toBe(
        interaction
      );
      await expect(checkout.submit(target)).resolves.toBeUndefined();

      expect(mockNativeCheckout.isAvailable).toHaveBeenCalledWith(
        'checkout-private-id',
        target
      );
      expect(mockNativeCheckout.requiresUserInteraction).toHaveBeenCalledWith(
        'checkout-private-id',
        target
      );
      expect(mockNativeCheckout.submit).toHaveBeenCalledWith(
        'checkout-private-id',
        target
      );
    }
  );

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

  test.each([
    {},
    { kind: 'paymentMethod', type: '' },
    { kind: 'paymentMethod', type: '   ' },
    { kind: 'storedPaymentMethod', id: '' },
    { kind: 'storedPaymentMethod', id: 'stored-123', type: 'scheme' },
  ])('rejects non-canonical targets: %j', async (target) => {
    const checkout = createCheckout(
      descriptor,
      { paymentMethods: [] },
      {},
      { onInvalidated: jest.fn() }
    ).publicHandle;

    await expect(checkout.isAvailable(target as never)).rejects.toEqual({
      code: 'invalidTarget',
      phase: 'query',
    });
    expect(mockNativeCheckout.isAvailable).not.toHaveBeenCalled();
  });

  test('rejects unknown stored IDs without delegating to native', async () => {
    const checkout = createCheckout(
      descriptor,
      {
        paymentMethods: [{ type: 'scheme', name: 'Card' }],
        storedPaymentMethods: [{ id: 'known-stored-id', type: 'scheme' }],
      },
      {},
      { onInvalidated: jest.fn() }
    ).publicHandle;

    await expect(
      checkout.submit({ kind: 'storedPaymentMethod', id: 'unknown-stored-id' })
    ).rejects.toEqual({ code: 'invalidTarget', phase: 'presentation' });
    expect(mockNativeCheckout.submit).not.toHaveBeenCalled();
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

  test.each([
    {
      command: 'isAvailable',
      target: { kind: 'paymentMethod' as const, type: 'scheme' },
      nativeError: { code: 'invalidTarget', phase: 'query' },
      expected: { code: 'invalidTarget', phase: 'query' },
    },
    {
      command: 'requiresUserInteraction',
      target: { kind: 'storedPaymentMethod' as const, id: 'stored-123' },
      nativeError: { code: 'unsupportedCapability', phase: 'query' },
      expected: { code: 'unsupportedCapability', phase: 'query' },
    },
    {
      command: 'submit',
      target: { kind: 'paymentMethod' as const, type: 'scheme' },
      nativeError: { code: 'operationBusy', phase: 'presentation' },
      expected: { code: 'operationBusy', phase: 'presentation' },
    },
  ])(
    'preserves the approved public error snapshot for $command',
    async ({ command, target, nativeError, expected }) => {
      const checkout = createCheckout(
        descriptor,
        {
          paymentMethods: [{ type: 'scheme' }],
          storedPaymentMethods: [{ id: 'stored-123', type: 'scheme' }],
        },
        {},
        { onInvalidated: jest.fn() }
      ).publicHandle;
      mockNativeCheckout[command].mockRejectedValueOnce(nativeError);

      await expect(checkout[command](target as never)).rejects.toEqual(
        expected
      );
    }
  );
});
