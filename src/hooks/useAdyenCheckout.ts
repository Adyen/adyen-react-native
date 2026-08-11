import { createContext, useContext } from 'react';
import type {
  AdvancedCallbacks,
  Checkout,
  PaymentMethodsResponse,
  SessionCallbacks,
} from '../core';
import { MISSING_CONTEXT_ERROR } from './constants';

/**
 * Shape of the AdyenCheckout context value.
 */
export interface AdyenCheckoutContextType {
  /**
   * Sets up the sessions flow. Creates the checkout context, registers the
   * session lifecycle listeners, stores the callbacks and resolves to a
   * {@link Checkout}.
   * @param sessionID - The session identifier from the `/sessions` response.
   * @param sessionData - The session data from the `/sessions` response.
   * @param callbacks - Callbacks invoked for the session lifecycle.
   */
  setup(
    sessionID: string,
    sessionData: string,
    callbacks: SessionCallbacks
  ): Promise<Checkout>;

  /**
   * Sets up the advanced flow. Creates the checkout context, registers the
   * advanced lifecycle listeners, stores the callbacks and resolves to a
   * {@link Checkout}.
   * @param paymentMethods - The payment methods response from the Adyen API.
   * @param callbacks - Callbacks invoked for the advanced lifecycle.
   */
  setupAdvanced(
    paymentMethods: PaymentMethodsResponse,
    callbacks: AdvancedCallbacks
  ): Promise<Checkout>;

  /**
   * The active {@link Checkout}, or `null` until `setup`/`setupAdvanced`
   * resolves.
   */
  checkout: Checkout | null;
}

export const AdyenCheckoutContext =
  createContext<AdyenCheckoutContextType | null>(null);

/**
 * Returns the AdyenCheckout context. Must be called from within an
 * `<AdyenCheckout>` provider; throws otherwise.
 */
export const useAdyenCheckout = (): AdyenCheckoutContextType => {
  const context = useContext(AdyenCheckoutContext);
  if (context !== null) {
    return context;
  }
  throw new Error(MISSING_CONTEXT_ERROR);
};
