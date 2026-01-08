import type {
  AddressLookup,
  AddressLookupItem,
  Balance,
  Order,
  PartialPaymentComponent,
  PaymentMethodsResponse,
} from '../../core';
import { Event } from '../../core';
import {
  ActionHandlingComponentWrapper,
  type ActionHandlingNativeModule,
} from '../base/ActionHandlingComponentWrapper';
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
    ActionHandlingNativeModule,
    PartialPaymentComponent,
    DropInModule,
    RemovesStoredPayment {
  update(results: AddressLookupItem[]): void;
  confirm(
    success: boolean,
    addressOrError?: AddressLookupItem | { message?: string }
  ): void;
}

/**
 * Drop-in wrapper with full feature support.
 * Supports: BIN events, address lookup, partial payments, stored payment management.
 */
export class DropInWrapper
  extends ActionHandlingComponentWrapper<DropInNativeModule>
  implements
    DropInModule,
    AddressLookup,
    RemovesStoredPayment,
    PartialPaymentComponent
{
  static readonly events = [
    Event.onBinValue,
    Event.onBinLookup,
    Event.onDisableStoredPaymentMethod,
    Event.onAddressConfirm,
    Event.onAddressUpdate,
    Event.onCheckBalance,
    Event.onRequestOrder,
    Event.onCancelOrder,
  ];

  name: string = 'DropIn';

  getReturnURL(): Promise<string> {
    return this.nativeModule.getReturnURL();
  }
  removeStored(success: boolean): void {
    this.nativeModule.removeStored(success);
  }
  update(results: AddressLookupItem[]) {
    this.nativeModule.update(results);
  }
  confirm(address: AddressLookupItem) {
    this.nativeModule.confirm(true, address);
  }
  reject(error?: { message: string }) {
    this.nativeModule.confirm(false, error);
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
