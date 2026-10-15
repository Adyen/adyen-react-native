//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import NativeCheckout, {
  type CheckoutDescriptor,
} from '../specs/NativeAdyenCheckout';
import type {
  AdvancedCallbacks,
  Checkout,
  CheckoutErrorPhase,
  CheckoutPaymentMethod,
  Configuration,
  Controller,
  PaymentMethodsView,
  SessionCallbacks,
} from '../core';
import { asCheckoutError } from './errors';
import { createController, isControllerDescriptor } from './createController';
import type { CheckoutLifecycle } from './types';
import { isRecord } from './utils/isRecord';

export interface CheckoutCallbacks {
  session?: SessionCallbacks;
  advanced?: AdvancedCallbacks;
  configuration?: Configuration;
}

export interface CheckoutHandle {
  readonly checkoutId: string;
  readonly flow: 'sessions' | 'advanced';
  readonly callbacks: CheckoutCallbacks;
  readonly publicHandle: Checkout;
  isActive(): boolean;
  markStale(): void;
}

const handles = new WeakMap<Checkout, CheckoutHandle>();

/** Resolves a merchant handle to its private bridge metadata. */
export function checkoutHandleFor(
  checkout: Checkout
): CheckoutHandle | undefined {
  return handles.get(checkout);
}

function indexById(
  paymentMethods: PaymentMethodsView
): Map<string, CheckoutPaymentMethod> {
  const index = new Map<string, CheckoutPaymentMethod>();
  for (const paymentMethod of paymentMethods.regular) {
    index.set(paymentMethod.id, paymentMethod);
  }
  for (const paymentMethod of paymentMethods.stored) {
    index.set(paymentMethod.id, paymentMethod);
  }
  return index;
}

/**
 * Builds a public handle backed by one opaque native checkout identity.
 *
 * Identity and callbacks remain internal to this closure. Payment methods are resolved by `id`
 * against the published snapshot before any command reaches native code; the native coordinator
 * remains the authority for stale, busy, and unsupported errors.
 */
export function createCheckout(
  descriptor: CheckoutDescriptor,
  paymentMethods: PaymentMethodsView,
  callbacks: CheckoutCallbacks,
  lifecycle: CheckoutLifecycle
): CheckoutHandle {
  let active = true;
  const knownPaymentMethods = indexById(paymentMethods);
  const controllers = new Map<string, Promise<Controller>>();

  const resolve = <Value>(
    phase: CheckoutErrorPhase,
    paymentMethod: unknown,
    command: (known: CheckoutPaymentMethod) => Promise<Value>
  ): Promise<Value> => {
    if (!active) {
      return Promise.reject(asCheckoutError({ code: 'staleCheckout', phase }));
    }
    const known =
      isRecord(paymentMethod) && typeof paymentMethod.id === 'string'
        ? knownPaymentMethods.get(paymentMethod.id)
        : undefined;
    if (!known) {
      return Promise.reject(asCheckoutError({ code: 'invalidTarget', phase }));
    }
    return command(known);
  };

  const createControllerFor = (
    paymentMethod: CheckoutPaymentMethod
  ): Promise<Controller> => {
    const existing = controllers.get(paymentMethod.id);
    if (existing) return existing;

    const creation = NativeCheckout.createController(
      descriptor.checkoutId,
      paymentMethod.id
    ).then(
      (native) => {
        if (!active) {
          throw asCheckoutError({
            code: 'staleCheckout',
            phase: 'presentation',
          });
        }
        if (!isControllerDescriptor(native)) {
          throw asCheckoutError({ code: 'cancelled', phase: 'presentation' });
        }
        return createController(handle, paymentMethod, native);
      },
      (error: unknown) => {
        throw asCheckoutError(error, 'presentation');
      }
    );
    controllers.set(paymentMethod.id, creation);
    // A failed creation must not be cached, so a later call can retry.
    creation.catch(() => {
      if (controllers.get(paymentMethod.id) === creation) {
        controllers.delete(paymentMethod.id);
      }
    });
    return creation;
  };

  const handle: CheckoutHandle = {
    checkoutId: descriptor.checkoutId,
    flow: descriptor.flow,
    callbacks,
    isActive: () => active,
    markStale: () => {
      active = false;
      controllers.clear();
    },
    publicHandle: Object.freeze({
      flow: descriptor.flow,
      paymentMethods,
      isAvailable: (paymentMethod: CheckoutPaymentMethod) =>
        resolve('query', paymentMethod, (known) =>
          NativeCheckout.isAvailable(descriptor.checkoutId, known.id).catch(
            (error: unknown) => {
              throw asCheckoutError(error, 'query');
            }
          )
        ),
      createController: (paymentMethod: CheckoutPaymentMethod) =>
        resolve('presentation', paymentMethod, createControllerFor),
      invalidate: async () => {
        if (!active) return;
        handle.markStale();
        try {
          await NativeCheckout.invalidate(descriptor.checkoutId);
        } catch (error) {
          throw asCheckoutError(error, 'cleanup');
        } finally {
          lifecycle.onInvalidated(handle);
        }
      },
    }),
  };
  handles.set(handle.publicHandle, handle);
  return handle;
}
