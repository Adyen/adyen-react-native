import type { NativeModule } from 'react-native';
import { NativeModules } from 'react-native';
import type { AddressLookup } from '../core/configurations/AddressLookup';
import type { AdyenActionComponent } from '../core/AdyenNativeModules';
import { ModuleMock } from './ModuleMock';
import type { Order, PaymentMethodsResponse } from '../core/types';

/** Describes Drop-in module. */

export interface DropInModule
  extends AdyenActionComponent, NativeModule, AddressLookup {
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
export const AdyenDropIn: DropInModule =
  NativeModules.AdyenDropIn ?? ModuleMock;
