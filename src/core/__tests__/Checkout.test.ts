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

describe('createCheckout', () => {
  beforeEach(() => {
    mockIsAvailable.mockReset();
    mockRequiresUserInteraction.mockReset();
    mockSubmit.mockReset();
  });

  test('exposes the provided paymentMethods', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(paymentMethods);

    expect(checkout.paymentMethods).toBe(paymentMethods);
  });

  test('isAvailable delegates to ContextModule', async () => {
    mockIsAvailable.mockResolvedValue(true);
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(paymentMethods);

    await expect(checkout.isAvailable('scheme')).resolves.toBe(true);
    expect(mockIsAvailable).toHaveBeenCalledWith('scheme');
  });

  test('requiresUserInteraction delegates to ContextModule', async () => {
    mockRequiresUserInteraction.mockResolvedValue(false);
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(paymentMethods);

    await expect(checkout.requiresUserInteraction('googlepay')).resolves.toBe(
      false
    );
    expect(mockRequiresUserInteraction).toHaveBeenCalledWith('googlepay');
  });

  test('submit delegates to ContextModule', () => {
    const { createCheckout } = require('../Checkout');

    const checkout = createCheckout(paymentMethods);
    checkout.submit('applepay');

    expect(mockSubmit).toHaveBeenCalledWith('applepay');
  });
});
