import { NativeModules } from 'react-native';
import type { AddressLookup } from '../../core/configurations';
import { ModuleMock } from '../base/ModuleMock';
import type {
  Order,
  PaymentMethodsResponse,
  AdyenActionComponent,
} from '../../core/types';
import { DropInWrapper } from './DropInWrapper';

/** Describes Drop-in module. */

export interface DropInModule extends AdyenActionComponent, AddressLookup {
  /**
   * Provides return URL for current application.
   */
  getReturnURL: () => Promise<string>;

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
