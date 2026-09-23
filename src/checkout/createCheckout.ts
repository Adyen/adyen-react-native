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
  CheckoutTarget,
  Configuration,
  PaymentMethodsResponse,
  SessionCallbacks,
} from '../core';
import { asCheckoutError } from './errors';
import type { CheckoutLifecycle } from './types';

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

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function invalidTarget(phase: 'query' | 'presentation'): Promise<never> {
  return Promise.reject(asCheckoutError({ code: 'invalidTarget', phase }));
}

function isCheckoutTarget(target: unknown): target is CheckoutTarget {
  if (!target || typeof target !== 'object') return false;
  const candidate = target as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.length !== 2 || !keys.includes('kind')) return false;
  return (
    (candidate.kind === 'paymentMethod' &&
      typeof candidate.type === 'string' &&
      candidate.type.trim().length > 0 &&
      keys.includes('type')) ||
    (candidate.kind === 'storedPaymentMethod' &&
      typeof candidate.id === 'string' &&
      candidate.id.trim().length > 0 &&
      keys.includes('id'))
  );
}

function isKnownTarget(
  target: CheckoutTarget,
  paymentMethods: PaymentMethodsResponse
): boolean {
  if (target.kind === 'paymentMethod') {
    return (
      paymentMethods.paymentMethods?.some(
        (paymentMethod) => paymentMethod.type === target.type
      ) ?? false
    );
  }
  return (
    paymentMethods.storedPaymentMethods?.some(
      (paymentMethod) => paymentMethod.id === target.id
    ) ?? false
  );
}

/**
 * Builds a public handle backed by one opaque native checkout identity.
 *
 * Identity and callbacks remain internal to this closure. The native coordinator remains the
 * authority for stale, busy, unsupported, and target-resolution errors.
 */
export function createCheckout(
  descriptor: CheckoutDescriptor,
  paymentMethods: PaymentMethodsResponse,
  callbacks: CheckoutCallbacks,
  lifecycle: CheckoutLifecycle
): CheckoutHandle {
  let active = true;
  const snapshot = deepFreeze(JSON.parse(JSON.stringify(paymentMethods)));

  const run = <Value>(
    phase: 'query' | 'presentation',
    target: unknown,
    command: (validTarget: CheckoutTarget) => Promise<Value>
  ): Promise<Value> => {
    if (!active) {
      return Promise.reject(asCheckoutError({ code: 'staleCheckout', phase }));
    }
    if (!isCheckoutTarget(target) || !isKnownTarget(target, snapshot)) {
      return invalidTarget(phase);
    }
    return command(target).catch((error: unknown) => {
      throw asCheckoutError(error, phase);
    });
  };

  const handle: CheckoutHandle = {
    checkoutId: descriptor.checkoutId,
    flow: descriptor.flow,
    callbacks,
    isActive: () => active,
    markStale: () => {
      active = false;
    },
    publicHandle: {
      flow: descriptor.flow,
      paymentMethods: snapshot,
      isAvailable: (target) =>
        run('query', target, (validTarget) =>
          NativeCheckout.isAvailable(descriptor.checkoutId, validTarget)
        ),
      requiresUserInteraction: (target) =>
        run('query', target, (validTarget) =>
          NativeCheckout.requiresUserInteraction(
            descriptor.checkoutId,
            validTarget
          )
        ),
      submit: (target) =>
        run('presentation', target, (validTarget) =>
          NativeCheckout.submit(descriptor.checkoutId, validTarget)
        ),
      invalidate: async () => {
        if (!active) return;
        active = false;
        try {
          await NativeCheckout.invalidate(descriptor.checkoutId);
        } catch (error) {
          throw asCheckoutError(error, 'cleanup');
        } finally {
          lifecycle.onInvalidated(handle);
        }
      },
    },
  };
  handles.set(handle.publicHandle, handle);
  return handle;
}
