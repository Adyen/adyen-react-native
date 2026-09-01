import type {
  AddressLookup,
  AddressLookupItem,
  Balance,
  Checkout,
  Order,
  PartialPaymentComponent,
  PaymentMethodsResponse,
} from '../../core';
import { ModuleWrapper, type BaseNativeModule } from '../base/ModuleWrapper';
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
  extends BaseNativeModule, PartialPaymentComponent, RemovesStoredPayment {
  start(paymentMethods: PaymentMethodsResponse): void;
  getReturnURL(): Promise<string>;
  providePaymentMethods(
    paymentMethods: PaymentMethodsResponse,
    order: Order | undefined
  ): void;
  update(results: AddressLookupItem[]): void;
  confirm(
    success: boolean,
    body?: AddressLookupItem | { message?: string }
  ): void;
}

/**
 * Drop-in wrapper with full feature support.
 */
export class DropInWrapper
  extends ModuleWrapper<DropInNativeModule>
  implements
    DropInModule,
    RemovesStoredPayment,
    PartialPaymentComponent,
    AddressLookup
{
  name: string = 'DropIn';

  start(checkout: Checkout): void {
    this.nativeModule.start(checkout.paymentMethods);
  }

  getReturnURL(): Promise<string> {
    return this.nativeModule.getReturnURL();
  }

  // Address lookup methods (absorbed from AddressLookupModule)
  update(results: AddressLookupItem[]) {
    this.nativeModule.update(results);
  }
  confirm(address: AddressLookupItem) {
    this.nativeModule.confirm(true, address);
  }
  reject(error?: { message: string }) {
    this.nativeModule.confirm(false, error);
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
