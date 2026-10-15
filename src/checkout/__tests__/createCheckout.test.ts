//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

type AnyFn = (...args: any[]) => any;

jest.mock('../../specs/NativeAdyenCheckout', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn<AnyFn>(),
    createController: jest.fn<AnyFn>(),
    submitController: jest.fn<AnyFn>(),
    invalidate: jest.fn<AnyFn>(),
  },
}));

import { createCheckout } from '../createCheckout';
import { controllerHandleFor } from '../createController';
import { createPaymentMethodsView } from '../paymentMethodsView';

const native = require('../../specs/NativeAdyenCheckout').default as {
  isAvailable: jest.Mock<AnyFn>;
  createController: jest.Mock<AnyFn>;
  submitController: jest.Mock<AnyFn>;
  invalidate: jest.Mock<AnyFn>;
};

const descriptor = {
  checkoutId: 'checkout-private-id',
  flow: 'advanced' as const,
  paymentMethodsJson: JSON.stringify({
    paymentMethods: [
      { id: 'pm-scheme', type: 'scheme', name: 'Card' },
      { id: 'pm-gift-1', type: 'giftcard', name: 'Givex', brand: 'givex' },
      { id: 'pm-gift-2', type: 'giftcard', name: 'Plastix', brand: 'plastix' },
    ],
    storedPaymentMethods: [
      {
        id: 'stored-1',
        type: 'scheme',
        name: 'Stored card',
        supportedShopperInteractions: ['Ecommerce'],
      },
    ],
  }),
};

function makeCheckout(onInvalidated = jest.fn<AnyFn>()) {
  return createCheckout(
    descriptor,
    createPaymentMethodsView(descriptor.paymentMethodsJson),
    {},
    { onInvalidated }
  );
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe('createCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('forwards the private checkout identity and the payment method id', async () => {
      native.isAvailable.mockResolvedValueOnce(true);
      const checkout = makeCheckout().publicHandle;
      const giftcard = checkout.paymentMethods.regular.first(
        (pm) => pm.brand === 'plastix'
      )!;

      await expect(checkout.isAvailable(giftcard)).resolves.toBe(true);
      expect(native.isAvailable).toHaveBeenCalledWith(
        'checkout-private-id',
        'pm-gift-2'
      );
    });

    test('forwards stored payment methods by their API id', async () => {
      native.isAvailable.mockResolvedValueOnce(false);
      const checkout = makeCheckout().publicHandle;

      await expect(
        checkout.isAvailable(checkout.paymentMethods.stored.first()!)
      ).resolves.toBe(false);
      expect(native.isAvailable).toHaveBeenCalledWith(
        'checkout-private-id',
        'stored-1'
      );
    });

    test.each([
      ['an unknown id', { id: 'foreign', type: 'scheme', name: 'Card' }],
      ['a payment method without id', { type: 'scheme', name: 'Card' }],
      ['a non-object', 'scheme'],
      ['undefined', undefined],
    ])(
      'rejects %s with invalidTarget without calling native',
      async (_, paymentMethod) => {
        const checkout = makeCheckout().publicHandle;

        await expect(
          checkout.isAvailable(paymentMethod as never)
        ).rejects.toEqual({ code: 'invalidTarget', phase: 'query' });
        expect(native.isAvailable).not.toHaveBeenCalled();
      }
    );

    test.each([
      { code: 'invalidTarget', phase: 'query' },
      { code: 'unsupportedCapability', phase: 'query' },
      { code: 'staleCheckout', phase: 'query' },
    ])('maps native rejection $code to a portable error', async (error) => {
      native.isAvailable.mockRejectedValueOnce({
        ...error,
        message: 'CheckoutCoordinator<checkout-private-id>',
      });
      const checkout = makeCheckout().publicHandle;

      await expect(
        checkout.isAvailable(checkout.paymentMethods.regular.first()!)
      ).rejects.toEqual(error);
    });

    test('maps an unknown native rejection to cancelled', async () => {
      native.isAvailable.mockRejectedValueOnce(new Error('boom'));
      const checkout = makeCheckout().publicHandle;

      await expect(
        checkout.isAvailable(checkout.paymentMethods.regular.first()!)
      ).rejects.toEqual({ code: 'cancelled', phase: 'query' });
    });
  });

  describe('createController', () => {
    test('returns a controller with the snapshot payment method and creation descriptor', async () => {
      native.createController.mockResolvedValueOnce({
        controllerId: 'controller-private-id',
        requiresUserInteraction: true,
      });
      const checkout = makeCheckout().publicHandle;
      const scheme = checkout.paymentMethods.regular.first()!;

      const controller = await checkout.createController(scheme);

      expect(native.createController).toHaveBeenCalledWith(
        'checkout-private-id',
        'pm-scheme'
      );
      expect(controller.paymentMethod).toBe(scheme);
      expect(controller.requiresUserInteraction).toBe(true);
      expect(Object.keys(controller).sort()).toEqual([
        'paymentMethod',
        'requiresUserInteraction',
        'submit',
      ]);
      expect(JSON.stringify(controller)).not.toContain('private');
      expect(Object.isFrozen(controller)).toBe(true);
    });

    test('resolves an equal payment method object to the snapshot instance', async () => {
      native.createController.mockResolvedValueOnce({
        controllerId: 'controller-stored',
        requiresUserInteraction: false,
      });
      const checkout = makeCheckout().publicHandle;
      const stored = checkout.paymentMethods.stored.first()!;

      const controller = await checkout.createController({ ...stored });

      expect(controller.paymentMethod).toBe(stored);
      expect(controller.requiresUserInteraction).toBe(false);
    });

    test('is idempotent by payment method id', async () => {
      native.createController.mockResolvedValue({
        controllerId: 'controller-scheme',
        requiresUserInteraction: true,
      });
      const checkout = makeCheckout().publicHandle;
      const scheme = checkout.paymentMethods.regular.first()!;

      const first = await checkout.createController(scheme);
      const second = await checkout.createController(scheme);
      const third = await checkout.createController({ ...scheme });

      expect(second).toBe(first);
      expect(third).toBe(first);
      expect(native.createController).toHaveBeenCalledTimes(1);
    });

    test('shares one native creation between concurrent calls', async () => {
      const creation = deferred<unknown>();
      native.createController.mockReturnValueOnce(creation.promise);
      const checkout = makeCheckout().publicHandle;
      const scheme = checkout.paymentMethods.regular.first()!;

      const first = checkout.createController(scheme);
      const second = checkout.createController(scheme);
      creation.resolve({
        controllerId: 'controller-scheme',
        requiresUserInteraction: true,
      });

      expect(await second).toBe(await first);
      expect(native.createController).toHaveBeenCalledTimes(1);
    });

    test('creates distinct controllers for same-type payment methods', async () => {
      native.createController
        .mockResolvedValueOnce({
          controllerId: 'controller-gift-1',
          requiresUserInteraction: true,
        })
        .mockResolvedValueOnce({
          controllerId: 'controller-gift-2',
          requiresUserInteraction: true,
        });
      const checkout = makeCheckout().publicHandle;
      const [gift1, gift2] = [...checkout.paymentMethods.regular].filter(
        (pm) => pm.type === 'giftcard'
      );

      const first = await checkout.createController(gift1!);
      const second = await checkout.createController(gift2!);

      expect(first).not.toBe(second);
      expect(controllerHandleFor(first)?.controllerId).toBe(
        'controller-gift-1'
      );
      expect(controllerHandleFor(second)?.controllerId).toBe(
        'controller-gift-2'
      );
    });

    test('rejects a foreign payment method with invalidTarget without calling native', async () => {
      const checkout = makeCheckout().publicHandle;

      await expect(
        checkout.createController({
          id: 'foreign',
          type: 'scheme',
          name: 'Card',
        })
      ).rejects.toEqual({ code: 'invalidTarget', phase: 'presentation' });
      expect(native.createController).not.toHaveBeenCalled();
    });

    test('maps native rejections and allows a retry after failure', async () => {
      native.createController
        .mockRejectedValueOnce({
          code: 'unsupportedCapability',
          phase: 'presentation',
          message: 'ComponentFactory<controller-private-id>',
        })
        .mockResolvedValueOnce({
          controllerId: 'controller-retry',
          requiresUserInteraction: false,
        });
      const checkout = makeCheckout().publicHandle;
      const scheme = checkout.paymentMethods.regular.first()!;

      await expect(checkout.createController(scheme)).rejects.toEqual({
        code: 'unsupportedCapability',
        phase: 'presentation',
      });
      await expect(checkout.createController(scheme)).resolves.toMatchObject({
        requiresUserInteraction: false,
      });
      expect(native.createController).toHaveBeenCalledTimes(2);
    });

    test('rejects a malformed native descriptor', async () => {
      native.createController.mockResolvedValueOnce({ controllerId: '' });
      const checkout = makeCheckout().publicHandle;

      await expect(
        checkout.createController(checkout.paymentMethods.regular.first()!)
      ).rejects.toEqual({ code: 'cancelled', phase: 'presentation' });
    });

    test('rejects staleCheckout when the checkout goes stale during creation', async () => {
      const creation = deferred<unknown>();
      native.createController.mockReturnValueOnce(creation.promise);
      const handle = makeCheckout();
      const pending = handle.publicHandle.createController(
        handle.publicHandle.paymentMethods.regular.first()!
      );

      handle.markStale();
      creation.resolve({
        controllerId: 'controller-late',
        requiresUserInteraction: true,
      });

      await expect(pending).rejects.toEqual({
        code: 'staleCheckout',
        phase: 'presentation',
      });
    });
  });

  describe('controller', () => {
    test('submit forwards the private checkout and controller identities', async () => {
      native.createController.mockResolvedValueOnce({
        controllerId: 'controller-private-id',
        requiresUserInteraction: false,
      });
      native.submitController.mockResolvedValueOnce(undefined);
      const checkout = makeCheckout().publicHandle;
      const controller = await checkout.createController(
        checkout.paymentMethods.regular.first()!
      );

      await expect(controller.submit()).resolves.toBeUndefined();
      expect(native.submitController).toHaveBeenCalledWith(
        'checkout-private-id',
        'controller-private-id'
      );
    });

    test.each([
      { code: 'operationBusy', phase: 'presentation' },
      { code: 'staleCheckout', phase: 'presentation' },
      { code: 'unsupportedCapability', phase: 'presentation' },
    ])('submit maps native rejection $code', async (error) => {
      native.createController.mockResolvedValueOnce({
        controllerId: 'controller-private-id',
        requiresUserInteraction: false,
      });
      native.submitController.mockRejectedValueOnce({
        ...error,
        message: 'Coordinator<controller-private-id>',
      });
      const checkout = makeCheckout().publicHandle;
      const controller = await checkout.createController(
        checkout.paymentMethods.regular.first()!
      );

      await expect(controller.submit()).rejects.toEqual(error);
    });

    test('rejects every command with staleCheckout once its checkout is stale', async () => {
      native.createController.mockResolvedValueOnce({
        controllerId: 'controller-private-id',
        requiresUserInteraction: true,
      });
      const handle = makeCheckout();
      const checkout = handle.publicHandle;
      const scheme = checkout.paymentMethods.regular.first()!;
      const controller = await checkout.createController(scheme);

      handle.markStale();

      await expect(controller.submit()).rejects.toEqual({
        code: 'staleCheckout',
        phase: 'presentation',
      });
      await expect(checkout.createController(scheme)).rejects.toEqual({
        code: 'staleCheckout',
        phase: 'presentation',
      });
      await expect(checkout.isAvailable(scheme)).rejects.toEqual({
        code: 'staleCheckout',
        phase: 'query',
      });
      expect(controllerHandleFor(controller)?.isActive()).toBe(false);
      expect(native.submitController).not.toHaveBeenCalled();
      expect(native.isAvailable).not.toHaveBeenCalled();
    });

    test('keeps native identities out of the public controller', async () => {
      native.createController.mockResolvedValueOnce({
        controllerId: 'controller-private-id',
        requiresUserInteraction: true,
      });
      const checkout = makeCheckout().publicHandle;
      const controller = await checkout.createController(
        checkout.paymentMethods.regular.first()!
      );

      expect(controller).not.toHaveProperty('controllerId');
      expect(controller).not.toHaveProperty('checkoutId');
      expect(controllerHandleFor({ ...controller })).toBeUndefined();
    });
  });

  describe('invalidate', () => {
    test('invalidates once and stales the checkout and its controllers', async () => {
      native.invalidate.mockResolvedValue(undefined);
      native.createController.mockResolvedValueOnce({
        controllerId: 'controller-private-id',
        requiresUserInteraction: true,
      });
      const onInvalidated = jest.fn<AnyFn>();
      const handle = makeCheckout(onInvalidated);
      const controller = await handle.publicHandle.createController(
        handle.publicHandle.paymentMethods.regular.first()!
      );

      await handle.publicHandle.invalidate();
      await handle.publicHandle.invalidate();

      expect(native.invalidate).toHaveBeenCalledTimes(1);
      expect(native.invalidate).toHaveBeenCalledWith('checkout-private-id');
      expect(onInvalidated).toHaveBeenCalledTimes(1);
      expect(handle.isActive()).toBe(false);
      await expect(controller.submit()).rejects.toEqual({
        code: 'staleCheckout',
        phase: 'presentation',
      });
    });

    test('maps a native cleanup failure and still reports invalidation', async () => {
      native.invalidate.mockRejectedValueOnce({ code: 'checkoutBusy' });
      const onInvalidated = jest.fn<AnyFn>();
      const checkout = makeCheckout(onInvalidated).publicHandle;

      await expect(checkout.invalidate()).rejects.toEqual({
        code: 'checkoutBusy',
        phase: 'cleanup',
      });
      expect(onInvalidated).toHaveBeenCalledTimes(1);
    });
  });

  test('publishes no private identities on the checkout handle', () => {
    const checkout = makeCheckout().publicHandle;

    expect(Object.keys(checkout).sort()).toEqual([
      'createController',
      'flow',
      'invalidate',
      'isAvailable',
      'paymentMethods',
    ]);
    expect(JSON.stringify(checkout)).not.toContain('checkout-private-id');
  });
});
