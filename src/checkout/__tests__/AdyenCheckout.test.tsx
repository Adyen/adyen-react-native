//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../../specs/NativeAdyenCheckout', () => ({
  __esModule: true,
  default: {
    setupSession: jest.fn(),
    setupAdvanced: jest.fn(),
    isAvailable: jest.fn(),
    requiresUserInteraction: jest.fn(),
    submit: jest.fn(),
    invalidate: jest.fn(),
    respond: jest.fn(),
    startDropIn: jest.fn(),
    onCheckoutEvent: jest.fn(),
  },
}));

import { AdyenCheckout } from '..';

const native = require('../../specs/NativeAdyenCheckout').default as {
  setupSession: jest.Mock;
  setupAdvanced: jest.Mock;
  isAvailable: jest.Mock;
  requiresUserInteraction: jest.Mock;
  submit: jest.Mock;
  invalidate: jest.Mock;
  respond: jest.Mock;
  onCheckoutEvent: jest.Mock;
};

const configuration = {
  environment: 'test' as const,
  clientKey: 'test_ABCDEFGH',
  returnUrl: 'myapp://checkout',
};
const callbacks = {
  onSubmit: jest.fn(),
  onAdditionalDetails: jest.fn(),
  onComplete: jest.fn(),
  onError: jest.fn(),
};

function descriptor(id: string, flow: 'sessions' | 'advanced' = 'advanced') {
  return {
    checkoutId: id,
    flow,
    paymentMethodsJson:
      '{"paymentMethods":[{"type":"scheme","name":"Card"}],"storedPaymentMethods":[{"id":"one","type":"scheme","name":"Stored card"}]}',
  };
}

describe('AdyenCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('publishes only portable immutable checkout data', async () => {
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-one'));
    const checkout = await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );

    expect(checkout.flow).toBe('advanced');
    expect(Object.isFrozen(checkout.paymentMethods)).toBe(true);
    expect(checkout).not.toHaveProperty('configuration');
    expect(checkout).not.toHaveProperty('checkoutId');
  });

  test('settles a rejecting merchant callback with its correlated failure response', async () => {
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-events'));
    callbacks.onSubmit.mockRejectedValueOnce(new Error('merchant failed'));
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-events',
      operationId: 'operation-events',
      requestId: 'request-events',
      kind: 'advancedSubmit',
      payloadJson:
        '{"paymentMethod":{"type":"scheme"},"returnUrl":"app://return"}',
    });

    expect(native.respond).toHaveBeenLastCalledWith({
      checkoutId: 'checkout-events',
      operationId: 'operation-events',
      requestId: 'request-events',
      kind: 'advancedSubmit',
      payloadJson: '{"type":"failure","code":"cancelled"}',
    });
  });

  test('stales the old handle before replacement and leaves it stale after a failed replacement', async () => {
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-two'));
    const oldCheckout = await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    native.setupAdvanced.mockRejectedValueOnce({
      code: 'invalidConfiguration',
      phase: 'setup',
    });

    await expect(
      AdyenCheckout.setupAdvanced(
        { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
        configuration,
        callbacks
      )
    ).rejects.toMatchObject({ code: 'invalidConfiguration', phase: 'setup' });
    await expect(
      oldCheckout.submit({ kind: 'paymentMethod', type: 'scheme' })
    ).rejects.toMatchObject({ code: 'staleCheckout', phase: 'presentation' });
  });

  test('serializes overlapping setup calls before beginning replacement', async () => {
    let resolveFirstSetup:
      ((value: ReturnType<typeof descriptor>) => void) | undefined;
    native.setupAdvanced.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirstSetup = resolve;
        })
    );
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-second'));

    const first = AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    const second = AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );

    await new Promise(setImmediate);
    expect(native.setupAdvanced).toHaveBeenCalledTimes(1);
    expect(resolveFirstSetup).toBeDefined();
    resolveFirstSetup!(descriptor('checkout-first'));
    const firstCheckout = await first;
    const secondCheckout = await second;

    expect(native.invalidate).toHaveBeenCalledWith('checkout-first');
    await expect(
      firstCheckout.submit({ kind: 'paymentMethod', type: 'scheme' })
    ).rejects.toEqual({ code: 'staleCheckout', phase: 'presentation' });
    expect(secondCheckout.flow).toBe('advanced');
  });

  test('drops native error messages that could expose private details', async () => {
    native.setupAdvanced.mockRejectedValueOnce({
      code: 'staleCheckout',
      phase: 'setup',
      message: 'CheckoutCoordinator<checkout-private-id>',
    });

    await expect(
      AdyenCheckout.setupAdvanced(
        { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
        configuration,
        callbacks
      )
    ).rejects.toEqual({ code: 'staleCheckout', phase: 'setup' });
  });
});
