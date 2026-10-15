//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import NativeCheckout, {
  type ControllerDescriptor,
} from '../specs/NativeAdyenCheckout';
import type { CheckoutPaymentMethod, Controller } from '../core';
import { asCheckoutError } from './errors';

/** Private bridge metadata of a controller. Never reachable from the public value. */
export interface ControllerHandle {
  readonly checkoutId: string;
  readonly controllerId: string;
  isActive(): boolean;
}

/** The part of a checkout a controller depends on. */
export interface ControllerOwner {
  readonly checkoutId: string;
  isActive(): boolean;
}

const handles = new WeakMap<Controller, ControllerHandle>();

/** Resolves a merchant controller to its private bridge metadata. */
export function controllerHandleFor(
  controller: Controller
): ControllerHandle | undefined {
  return handles.get(controller);
}

export function isControllerDescriptor(
  value: unknown
): value is ControllerDescriptor {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.controllerId === 'string' &&
    candidate.controllerId.length > 0 &&
    typeof candidate.requiresUserInteraction === 'boolean'
  );
}

/**
 * Wraps a native controller in a public value.
 *
 * The controller cannot outlive its owner: once the checkout is stale, every command rejects
 * with `staleCheckout` without reaching native code.
 */
export function createController(
  owner: ControllerOwner,
  paymentMethod: CheckoutPaymentMethod,
  descriptor: ControllerDescriptor
): Controller {
  const handle: ControllerHandle = {
    checkoutId: owner.checkoutId,
    controllerId: descriptor.controllerId,
    isActive: () => owner.isActive(),
  };
  const controller: Controller = Object.freeze({
    paymentMethod,
    requiresUserInteraction: descriptor.requiresUserInteraction,
    submit: async () => {
      if (!handle.isActive()) {
        throw asCheckoutError({ code: 'staleCheckout', phase: 'presentation' });
      }
      try {
        await NativeCheckout.submitController(
          handle.checkoutId,
          handle.controllerId
        );
      } catch (error) {
        throw asCheckoutError(error, 'presentation');
      }
    },
  });
  handles.set(controller, handle);
  return controller;
}
