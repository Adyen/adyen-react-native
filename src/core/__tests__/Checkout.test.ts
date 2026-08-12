//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockIsAvailable = jest.fn<(type: string) => Promise<boolean>>();
const mockRequiresUserInteraction =
  jest.fn<(type: string) => Promise<boolean>>();
const mockSubmit = jest.fn<(type: string) => void>();

jest.mock('../../modules/context/ContextModule', () => ({
  AdyenContext: {
    isAvailable: mockIsAvailable,
    requiresUserInteraction: mockRequiresUserInteraction,
    submit: mockSubmit,
  },
}));

const paymentMethods = {
  paymentMethods: [{ type: 'scheme', name: 'Card' }],
};

const configuration = {
  environment: 'test' as const,
  clientKey: 'test_ABCDEFGH',
  returnUrl: 'myapp://checkout',
};

const mockSubscribeFn = jest.fn();
const mockUnsubscribeFn = jest.fn();
const mockCleanupFn = jest.fn();

describe('createCheckout', () => {
  beforeEach(() => {
    mockIsAvailable.mockReset();
    mockRequiresUserInteraction.mockReset();
    mockSubmit.mockReset();
    mockSubscribeFn.mockReset();
    mockUnsubscribeFn.mockReset();
    mockCleanupFn.mockReset();
  });

  test('exposes the provided paymentMethods', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );

    expect(checkout.paymentMethods).toBe(paymentMethods);
  });

  test('exposes the provided configuration', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );

    expect(checkout.configuration).toBe(configuration);
  });

  test('isAvailable delegates to ContextModule', async () => {
    mockIsAvailable.mockResolvedValue(true);
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );

    await expect(checkout.isAvailable('scheme')).resolves.toBe(true);
    expect(mockIsAvailable).toHaveBeenCalledWith('scheme');
  });

  test('requiresUserInteraction delegates to ContextModule', async () => {
    mockRequiresUserInteraction.mockResolvedValue(false);
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );

    await expect(checkout.requiresUserInteraction('googlepay')).resolves.toBe(
      false
    );
    expect(mockRequiresUserInteraction).toHaveBeenCalledWith('googlepay');
  });

  test('submit delegates to ContextModule', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );
    checkout.submit('applepay');

    expect(mockSubmit).toHaveBeenCalledWith('applepay');
  });

  test('cleanup delegates to provided cleanupFn', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );
    checkout.cleanup();

    expect(mockCleanupFn).toHaveBeenCalled();
  });

  test('subscribe delegates to provided subscribeFn', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );
    checkout.subscribe('view-1');

    expect(mockSubscribeFn).toHaveBeenCalledWith('view-1');
  });

  test('unsubscribe delegates to provided unsubscribeFn', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(
      paymentMethods,
      configuration,
      mockSubscribeFn,
      mockUnsubscribeFn,
      mockCleanupFn
    );
    checkout.unsubscribe('view-1');

    expect(mockUnsubscribeFn).toHaveBeenCalledWith('view-1');
  });
});
