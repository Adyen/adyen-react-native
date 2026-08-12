import { NativeModules } from 'react-native';
import type {
  Checkout,
  PaymentSubmitResultHandler,
  Order,
  PaymentMethodsResponse,
} from '../../core';
import { ModuleMock } from '../base/ModuleMock';
import { DropInWrapper } from './DropInWrapper';

// TODO: Re-add providePaymentResult/provideAdditionalDetailsResult as convenience methods in a future version

/** Describes Drop-in module. */
export interface DropInModule extends PaymentSubmitResultHandler {
  /**
   * Provides return URL for current application.
   */
  getReturnURL: () => Promise<string>;

  /**
   * Launches the Drop-in modal for the shared checkout context created by
   * `setup()` / `setupAdvanced()`. Drop-in does not own or manage session
   * state — it reads the payment methods from the shared {@link Checkout} and
   * opens the native modal.
   * @param checkout - The shared checkout obtained from `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()`.
   */
  start(checkout: Checkout): void;

  /**
   * Reloads the DropIn with a new PaymentMethods object and partial payment order.
   * @param paymentMethods JSON response from \paymentMethods API endpoint
   * @param order The order information required for partial payments.
   */
  providePaymentMethods(
    paymentMethods: PaymentMethodsResponse,
    order: Order | undefined
  ): void;
}

/** Drop-in is our pre-built UI solution for accepting payments. Drop-in shows all payment methods as a list and handles actions. */
export const AdyenDropIn: DropInModule = new DropInWrapper(
  NativeModules.AdyenDropIn ?? ModuleMock
);
