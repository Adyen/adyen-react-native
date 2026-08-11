import type {
  Balance,
  Checkout,
  Configuration,
  Order,
  PartialPaymentComponent,
  PaymentMethodsResponse,
} from '../../core';
import {
  AddressLookupModule,
  type AddressLookupNativeModule,
} from '../base/AddressLookupModule';
import type { DropInModule } from './AdyenDropIn';

/**
 * @internal
 * Interface for removing stored payment method.
 */
export interface RemovesStoredPayment {
  removeStored(success: boolean): void;
}

/**
 * @internal
 * Native module interface specific to DropIn.
 */
interface DropInNativeModule
  extends
    AddressLookupNativeModule,
    PartialPaymentComponent,
    RemovesStoredPayment {
  getReturnURL(): Promise<string>;
  providePaymentMethods(
    paymentMethods: PaymentMethodsResponse,
    order: Order | undefined
  ): void;
}

/**
 * Drop-in wrapper with full feature support.
 */
export class DropInWrapper
  extends AddressLookupModule<DropInNativeModule>
  implements DropInModule, RemovesStoredPayment, PartialPaymentComponent
{
  name: string = 'DropIn';

  start(checkout: Checkout, configuration: Configuration): void {
    // Drop-in depends on the shared checkout context for its payment methods
    // instead of managing its own session state; the native v5 modal still
    // receives them explicitly through the internal open().
    this.open(checkout.paymentMethods, configuration);
  }

  getReturnURL(): Promise<string> {
    return this.nativeModule.getReturnURL();
  }
  // TODO: v6 alpha - not yet supported
  removeStored(success: boolean): void {
    this.nativeModule.removeStored(success);
  }
  // TODO: v6 alpha - not yet supported
  provideBalance(
    success: boolean,
    balance: Balance | undefined,
    error: Error | undefined
  ): void {
    this.nativeModule.provideBalance(success, balance, error);
  }
  // TODO: v6 alpha - not yet supported
  provideOrder(
    success: boolean,
    order: Order | undefined,
    error: Error | undefined
  ): void {
    this.nativeModule.provideOrder(success, order, error);
  }
  // TODO: v6 alpha - not yet supported
  providePaymentMethods(
    paymentMethods: PaymentMethodsResponse,
    order: Order | undefined
  ): void {
    this.nativeModule.providePaymentMethods(paymentMethods, order);
  }
}
