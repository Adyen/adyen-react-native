import type { Checkout } from '../../core';
import NativeCheckout from '../../specs/NativeAdyenCheckout';
import { checkoutHandleFor } from '../../checkout/createCheckout';
import { asCheckoutError } from '../../checkout/errors';

/** Describes Drop-in module. */
export interface DropInModule {
  /** Launches coordinator-owned Drop-in for a live checkout. */
  start(checkout: Checkout): Promise<void>;
}

/**
 * Thin Drop-in façade. The only bridge input is the private identity associated with setup.
 * It owns neither configuration, payment methods, listeners, nor callbacks.
 */
export const AdyenDropIn: DropInModule = {
  async start(checkout: Checkout): Promise<void> {
    const handle = checkoutHandleFor(checkout);
    if (!handle || !handle.isActive()) {
      throw asCheckoutError({
        code: 'staleCheckout',
        phase: 'presentation',
      });
    }
    try {
      await NativeCheckout.startDropIn(handle.checkoutId);
    } catch (error) {
      throw asCheckoutError(error, 'presentation');
    }
  },
};
