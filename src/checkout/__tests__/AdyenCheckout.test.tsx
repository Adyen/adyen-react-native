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
const sessionCallbacks = {
  onComplete: jest.fn(),
  onError: jest.fn(),
  onBeforeSubmit: jest.fn(),
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

  test('rejects malformed before-submit results instead of proceeding', async () => {
    native.setupSession.mockResolvedValueOnce(
      descriptor('checkout-session', 'sessions')
    );
    sessionCallbacks.onBeforeSubmit.mockResolvedValueOnce({ type: 'proceed' });
    await AdyenCheckout.setup(
      { id: 'session-id', sessionData: 'session-data' },
      configuration,
      sessionCallbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-session',
      operationId: 'operation-session',
      requestId: 'request-session',
      kind: 'sessionBeforeSubmit',
      payloadJson: '{"shopperEmail":"shopper@example.com"}',
    });

    expect(native.respond).toHaveBeenLastCalledWith({
      checkoutId: 'checkout-session',
      operationId: 'operation-session',
      requestId: 'request-session',
      kind: 'sessionBeforeSubmit',
      payloadJson: '{"type":"failure","code":"cancelled"}',
    });
  });

  test.each([
    { shopperName: { firstName: 1 } },
    { shopperName: { lastName: null } },
  ])(
    'rejects configured before-submit shopper names with invalid member types',
    async (data) => {
      native.setupSession.mockResolvedValueOnce(
        descriptor('checkout-session-shopper-name', 'sessions')
      );
      sessionCallbacks.onBeforeSubmit.mockResolvedValueOnce({
        type: 'proceed',
        data,
      });
      await AdyenCheckout.setup(
        { id: 'session-id', sessionData: 'session-data' },
        configuration,
        sessionCallbacks
      );
      const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

      await eventHandler({
        checkoutId: 'checkout-session-shopper-name',
        operationId: 'operation-session',
        requestId: 'request-session',
        kind: 'sessionBeforeSubmit',
        payloadJson: '{}',
      });

      expect(native.respond).toHaveBeenLastCalledWith({
        checkoutId: 'checkout-session-shopper-name',
        operationId: 'operation-session',
        requestId: 'request-session',
        kind: 'sessionBeforeSubmit',
        payloadJson: '{"type":"failure","code":"cancelled"}',
      });
    }
  );

  test.each([{ shopperName: {} }, { shopperName: { firstName: 'Ada' } }])(
    'accepts empty and partial shopper names in configured before-submit results',
    async (data) => {
      native.setupSession.mockResolvedValueOnce(
        descriptor('checkout-session-valid-shopper-name', 'sessions')
      );
      sessionCallbacks.onBeforeSubmit.mockResolvedValueOnce({
        type: 'proceed',
        data,
      });
      await AdyenCheckout.setup(
        { id: 'session-id', sessionData: 'session-data' },
        configuration,
        sessionCallbacks
      );
      const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

      await eventHandler({
        checkoutId: 'checkout-session-valid-shopper-name',
        operationId: 'operation-session',
        requestId: 'request-session',
        kind: 'sessionBeforeSubmit',
        payloadJson: '{}',
      });

      expect(native.respond).toHaveBeenLastCalledWith({
        checkoutId: 'checkout-session-valid-shopper-name',
        operationId: 'operation-session',
        requestId: 'request-session',
        kind: 'sessionBeforeSubmit',
        payloadJson: JSON.stringify({ type: 'proceed', data }),
      });
    }
  );

  test('settles Promise-returning Apple Pay callback results by their correlation tuple', async () => {
    native.setupAdvanced.mockResolvedValueOnce(
      descriptor('checkout-apple-pay')
    );
    const onCouponCodeChange = jest.fn(async (request) => {
      expect(request).toEqual({ couponCode: 'SAVE10' });
      return { paymentSummaryItems: [{ label: 'Total', amount: '10.00' }] };
    });
    const onAuthorize = jest.fn((request) => {
      expect(request).toEqual({
        payment: { shippingContact: { countryCode: 'NL' } },
      });
      return Promise.resolve({ status: 'success' as const });
    });
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      {
        ...configuration,
        applepay: {
          merchantID: 'merchant.example',
          onCouponCodeChange,
          onAuthorize,
        },
      },
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-apple-pay',
      operationId: 'operation-apple-pay',
      requestId: 'request-coupon',
      kind: 'applePayCouponCode',
      payloadJson: '{"couponCode":"SAVE10"}',
    });
    expect(onCouponCodeChange).toHaveBeenCalledWith({ couponCode: 'SAVE10' });
    expect(native.respond).toHaveBeenLastCalledWith({
      checkoutId: 'checkout-apple-pay',
      operationId: 'operation-apple-pay',
      requestId: 'request-coupon',
      kind: 'applePayCouponCode',
      payloadJson:
        '{"paymentSummaryItems":[{"label":"Total","amount":"10.00"}]}',
    });

    await eventHandler({
      checkoutId: 'checkout-apple-pay',
      operationId: 'operation-apple-pay',
      requestId: 'request-authorization',
      kind: 'applePayAuthorization',
      payloadJson: '{"shippingContact":{"countryCode":"NL"}}',
    });
    expect(native.respond).toHaveBeenLastCalledWith({
      checkoutId: 'checkout-apple-pay',
      operationId: 'operation-apple-pay',
      requestId: 'request-authorization',
      kind: 'applePayAuthorization',
      payloadJson: '{"status":"success"}',
    });
  });

  test('settles a malformed Apple Pay callback result once with its correlated failure response', async () => {
    native.setupAdvanced.mockResolvedValueOnce(
      descriptor('checkout-malformed-coupon')
    );
    const onCouponCodeChange = jest.fn(() => ({
      paymentSummaryItems: [{ label: 'Total', amount: 10, type: 'unknown' }],
    }));
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      {
        ...configuration,
        applepay: {
          merchantID: 'merchant.example',
          onCouponCodeChange,
        },
      },
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    const settlement = eventHandler({
      checkoutId: 'checkout-malformed-coupon',
      operationId: 'operation-apple-pay',
      requestId: 'request-coupon',
      kind: 'applePayCouponCode',
      payloadJson: '{"couponCode":"SAVE10"}',
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(native.respond).toHaveBeenCalledWith({
      checkoutId: 'checkout-malformed-coupon',
      operationId: 'operation-apple-pay',
      requestId: 'request-coupon',
      kind: 'applePayCouponCode',
      payloadJson: '{"type":"failure","code":"cancelled"}',
    });
    await settlement;
    expect(native.respond).toHaveBeenCalledTimes(1);
  });

  test('settles a thrown Apple Pay callback once with its correlated failure response', async () => {
    native.setupAdvanced.mockResolvedValueOnce(
      descriptor('checkout-thrown-authorization')
    );
    const onAuthorize = jest.fn(() => {
      throw new Error('merchant rejected authorization');
    });
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      {
        ...configuration,
        applepay: {
          merchantID: 'merchant.example',
          onAuthorize,
        },
      },
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-thrown-authorization',
      operationId: 'operation-apple-pay',
      requestId: 'request-authorization',
      kind: 'applePayAuthorization',
      payloadJson: '{}',
    });

    expect(onAuthorize).toHaveBeenCalledWith({ payment: {} });
    expect(native.respond).toHaveBeenCalledTimes(1);
    expect(native.respond).toHaveBeenLastCalledWith({
      checkoutId: 'checkout-thrown-authorization',
      operationId: 'operation-apple-pay',
      requestId: 'request-authorization',
      kind: 'applePayAuthorization',
      payloadJson: '{"type":"failure","code":"cancelled"}',
    });
  });

  test('normalizes terminal failures to a complete portable error', async () => {
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-error'));
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-error',
      kind: 'error',
      payloadJson:
        '{"message":"CheckoutCoordinator<private-checkout-id> failed","errorCode":"nativePrivateError"}',
    });

    expect(callbacks.onError).toHaveBeenCalledWith({
      message: 'Checkout failed',
      errorCode: 'checkoutFailed',
    });
  });

  test('normalizes session terminal payloads before merchant delivery', async () => {
    native.setupSession.mockResolvedValueOnce(
      descriptor('checkout-session-terminal', 'sessions')
    );
    await AdyenCheckout.setup(
      { id: 'session-id', sessionData: 'session-data' },
      configuration,
      sessionCallbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-session-terminal',
      kind: 'completion',
      payloadJson:
        '{"sessionId":"session-id","resultCode":"Authorised","sessionData":"session-data","fabricated":"not-portable"}',
    });

    expect(sessionCallbacks.onComplete).toHaveBeenCalledWith({
      sessionId: 'session-id',
      resultCode: 'Authorised',
      sessionData: 'session-data',
    });
  });

  test('normalizes advanced terminal payloads before merchant delivery', async () => {
    native.setupAdvanced.mockResolvedValueOnce(
      descriptor('checkout-advanced-terminal')
    );
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-advanced-terminal',
      kind: 'completion',
      payloadJson:
        '{"resultCode":"Authorised","refusalReason":"ignored","action":{"type":"threeDS2","paymentMethodType":"scheme","fabricated":"not-portable"},"fabricated":"not-portable"}',
    });

    expect(callbacks.onComplete).toHaveBeenCalledWith({
      resultCode: 'Authorised',
      refusalReason: 'ignored',
      action: {
        type: 'threeDS2',
        paymentMethodType: 'scheme',
      },
    });
  });

  test.each([
    { type: 'action' },
    { type: 'action', action: { type: 'threeDS2' } },
    { type: 'action', action: { paymentMethodType: 'scheme' } },
    { type: 'completed' },
    { type: 'completed', resultCode: 1 },
    { type: 'retry', message: 1 },
    { type: 'unknown' },
  ])('rejects malformed advanced submit result %j', async (result) => {
    native.setupAdvanced.mockResolvedValueOnce(
      descriptor('checkout-invalid-submit')
    );
    callbacks.onSubmit.mockResolvedValueOnce(result);
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-invalid-submit',
      operationId: 'operation-submit',
      requestId: 'request-submit',
      kind: 'advancedSubmit',
      payloadJson: '{}',
    });

    expect(native.respond).toHaveBeenLastCalledWith({
      checkoutId: 'checkout-invalid-submit',
      operationId: 'operation-submit',
      requestId: 'request-submit',
      kind: 'advancedSubmit',
      payloadJson: '{"type":"failure","code":"cancelled"}',
    });
  });

  test.each([
    {
      type: 'action',
      action: { type: 'threeDS2', paymentMethodType: 'scheme' },
    },
    { type: 'completed', resultCode: 'Authorised' },
    { type: 'retry' },
    { type: 'retry', message: 'Try again' },
  ])('forwards valid advanced submit result %j', async (result) => {
    native.setupAdvanced.mockResolvedValueOnce(
      descriptor('checkout-valid-submit')
    );
    callbacks.onSubmit.mockResolvedValueOnce(result);
    await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];

    await eventHandler({
      checkoutId: 'checkout-valid-submit',
      operationId: 'operation-submit',
      requestId: 'request-submit',
      kind: 'advancedSubmit',
      payloadJson: '{}',
    });

    expect(native.respond).toHaveBeenLastCalledWith({
      checkoutId: 'checkout-valid-submit',
      operationId: 'operation-submit',
      requestId: 'request-submit',
      kind: 'advancedSubmit',
      payloadJson: JSON.stringify(result),
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

  test('drops stale checkout query, submit, response, and event inputs without touching the current checkout', async () => {
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-old'));
    const oldCheckout = await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );
    const eventHandler = native.onCheckoutEvent.mock.calls[0][0];
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-current'));
    const currentCheckout = await AdyenCheckout.setupAdvanced(
      { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
      configuration,
      callbacks
    );

    await expect(
      oldCheckout.isAvailable({ kind: 'paymentMethod', type: 'scheme' })
    ).rejects.toEqual({ code: 'staleCheckout', phase: 'query' });
    await expect(
      oldCheckout.submit({ kind: 'paymentMethod', type: 'scheme' })
    ).rejects.toEqual({ code: 'staleCheckout', phase: 'presentation' });
    await eventHandler({
      checkoutId: 'checkout-old',
      operationId: 'operation-old',
      requestId: 'request-old',
      kind: 'advancedSubmit',
      payloadJson: '{}',
    });

    expect(native.respond).not.toHaveBeenCalled();
    expect(callbacks.onSubmit).not.toHaveBeenCalled();
    native.isAvailable.mockResolvedValueOnce(true);
    await expect(
      currentCheckout.isAvailable({ kind: 'paymentMethod', type: 'scheme' })
    ).resolves.toBe(true);
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
