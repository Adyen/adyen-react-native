import { createContext, useContext } from 'react';
import type {
  AdvancedCallbacks,
  Checkout,
  Configuration,
  PaymentMethodsResponse,
  SessionCallbacks,
  SessionConfiguration,
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
   * @param session - The session configuration from the `/sessions` response.
   * @param configuration - The checkout configuration.
   * @param callbacks - Callbacks invoked for the session lifecycle.
   */
  setup(
    session: SessionConfiguration,
    configuration: Configuration,
    callbacks: SessionCallbacks
  ): Promise<Checkout>;

  /**
   * Sets up the advanced flow. Creates the checkout context, registers the
   * advanced lifecycle listeners, stores the callbacks and resolves to a
   * {@link Checkout}.
   * @param paymentMethods - The payment methods response from the Adyen API.
   * @param configuration - The checkout configuration.
   * @param callbacks - Callbacks invoked for the advanced lifecycle.
   */
  setupAdvanced(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration,
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
