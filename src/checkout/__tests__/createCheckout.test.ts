//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

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

const mockSubscribeFn = jest.fn<(viewId: string) => void>();
const mockUnsubscribeFn = jest.fn<(viewId: string) => void>();
const mockInvalidateFn = jest.fn<() => void>();

/** Builds a checkout whose host reports the given active state. */
function createTestCheckout(isActive = true) {
  const { createCheckout } = require('../createCheckout');
  return createCheckout(paymentMethods, configuration, {
    isActive: () => isActive,
    subscribe: mockSubscribeFn,
    unsubscribe: mockUnsubscribeFn,
    invalidate: mockInvalidateFn,
  });
}

describe('createCheckout', () => {
  beforeEach(() => {
    mockIsAvailable.mockReset();
    mockRequiresUserInteraction.mockReset();
    mockSubmit.mockReset();
    mockSubscribeFn.mockReset();
    mockUnsubscribeFn.mockReset();
    mockInvalidateFn.mockReset();
  });

  test('exposes the provided paymentMethods', () => {
    expect(createTestCheckout().paymentMethods).toBe(paymentMethods);
  });

  test('exposes the provided configuration', () => {
    expect(createTestCheckout().configuration).toBe(configuration);
  });

  test('isAvailable delegates to ContextModule', async () => {
    mockIsAvailable.mockResolvedValue(true);

    await expect(createTestCheckout().isAvailable('scheme')).resolves.toBe(
      true
    );
    expect(mockIsAvailable).toHaveBeenCalledWith('scheme');
  });

  test('requiresUserInteraction delegates to ContextModule', async () => {
    mockRequiresUserInteraction.mockResolvedValue(false);

    await expect(
      createTestCheckout().requiresUserInteraction('googlepay')
    ).resolves.toBe(false);
    expect(mockRequiresUserInteraction).toHaveBeenCalledWith('googlepay');
  });

  test('submit delegates to ContextModule', () => {
    createTestCheckout().submit('applepay');

    expect(mockSubmit).toHaveBeenCalledWith('applepay');
  });

  test('subscribe delegates to the host', () => {
    createTestCheckout().subscribe('view-1');

    expect(mockSubscribeFn).toHaveBeenCalledWith('view-1');
  });

  test('unsubscribe delegates to the host', () => {
    createTestCheckout().unsubscribe('view-1');

    expect(mockUnsubscribeFn).toHaveBeenCalledWith('view-1');
  });

  test('invalidate delegates to the host', () => {
    createTestCheckout().invalidate();

    expect(mockInvalidateFn).toHaveBeenCalledTimes(1);
  });

  describe('when the checkout is no longer active', () => {
    const originalWarn = console.warn;
    const warn = jest.fn();

    beforeEach(() => {
      warn.mockReset();
      console.warn = warn;
    });

    afterEach(() => {
      console.warn = originalWarn;
    });

    test('submit is ignored with a warning', () => {
      createTestCheckout(false).submit('scheme');

      expect(mockSubmit).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('checkout.submit()')
      );
    });

    test('isAvailable resolves false with a warning', async () => {
      await expect(
        createTestCheckout(false).isAvailable('scheme')
      ).resolves.toBe(false);

      expect(mockIsAvailable).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('checkout.isAvailable()')
      );
    });

    test('requiresUserInteraction resolves false with a warning', async () => {
      await expect(
        createTestCheckout(false).requiresUserInteraction('scheme')
      ).resolves.toBe(false);

      expect(mockRequiresUserInteraction).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('checkout.requiresUserInteraction()')
      );
    });

    test('subscribe is ignored with a warning', () => {
      createTestCheckout(false).subscribe('view-1');

      expect(mockSubscribeFn).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('checkout.subscribe()')
      );
    });

    test('unsubscribe still runs so views can tear down', () => {
      createTestCheckout(false).unsubscribe('view-1');

      expect(mockUnsubscribeFn).toHaveBeenCalledWith('view-1');
      expect(warn).not.toHaveBeenCalled();
    });

    test('invalidate stays a silent no-op', () => {
      createTestCheckout(false).invalidate();

      expect(mockInvalidateFn).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
