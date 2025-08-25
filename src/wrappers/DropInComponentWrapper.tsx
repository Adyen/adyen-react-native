import type { AddressLookupItem } from '../core/configurations/AddressLookup';
import type { Balance, Order, PaymentMethodsResponse } from '../core/types';
import { AdyenDropIn, type DropInModule } from '../modules/DropInModule';
import { ActionHandlingComponentWrapper } from './ActionHandlingComponentWrapper';
import type { AddressLookup } from './AddressLookupComponentWrapper';
import type { PartialPaymentComponent } from './PartialPaymentsComponentWrapper';
import type { RemovesStoredPayment } from './RemoveStoredPaymentComponentWrapper';
import { Event } from '../core/constants';

export class DropInComponentWrapper
  extends ActionHandlingComponentWrapper
  implements
    DropInModule,
    AddressLookup,
    RemovesStoredPayment,
    PartialPaymentComponent
{
  constructor() {
    super(AdyenDropIn, [
      Event.onBinValue,
      Event.onBinLookuop,
      Event.onCancelOrder,
      Event.onRequestOrder,
      Event.onCheckBalance,
      Event.onDisableStoredPaymentMethod,
      Event.onAddressConfirm,
      Event.onAddressUpdate,
    ]);
  }

  getReturnURL!: () => Promise<string>;

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
