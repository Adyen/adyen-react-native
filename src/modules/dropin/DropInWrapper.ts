import type {
  Balance,
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

/** Native module interface specific to DropIn */
interface DropInNativeModule
  extends
    AddressLookupNativeModule,
    PartialPaymentComponent,
    DropInModule,
    RemovesStoredPayment {}

/**
 * Drop-in wrapper with full feature support.
 */
export class DropInWrapper
  extends AddressLookupModule<DropInNativeModule>
  implements DropInModule, RemovesStoredPayment, PartialPaymentComponent
{
  name: string = 'DropIn';

  getReturnURL(): Promise<string> {
    return this.nativeModule.getReturnURL();
  }
  removeStored(success: boolean): void {
    this.nativeModule.removeStored(success);
  }
  provideBalance(
    success: boolean,
    balance: Balance | undefined,
    error: Error | undefined
  ): void {
    this.nativeModule.provideBalance(success, balance, error);
  }
  provideOrder(
    success: boolean,
    order: Order | undefined,
    error: Error | undefined
  ): void {
    this.nativeModule.provideOrder(success, order, error);
  }
  providePaymentMethods(
    paymentMethods: PaymentMethodsResponse,
    order: Order | undefined
  ): void {
    this.nativeModule.providePaymentMethods(paymentMethods, order);
  }
}
