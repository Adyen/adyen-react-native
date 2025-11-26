import type {
  AddressLookup,
  AddressLookupItem,
} from '../../core/configurations';
import type { Balance, Order, PaymentMethodsResponse } from '../../core/types';
import { ActionHandlingComponentWrapper } from '../base/ActionHandlingComponentWrapper';
import type { DropInModule } from './AdyenDropIn';
import { Event } from '../../core/constants';
import type { NativeModule } from 'react-native';
import type {
  PartialPaymentComponent,
  RemovesStoredPayment,
} from '../../core/configurations';

export class DropInWrapper
  extends ActionHandlingComponentWrapper
  implements
    DropInModule,
    AddressLookup,
    RemovesStoredPayment,
    PartialPaymentComponent
{
  name: string = 'DropIn';

  constructor(nativeModule: NativeModule) {
    super(nativeModule, [
      Event.onBinValue,
      Event.onBinLookup,
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
