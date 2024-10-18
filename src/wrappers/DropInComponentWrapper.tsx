import { AddressLookupItem } from '../core/configurations/AddressLookup';
import { Balance, Order } from '../core/types';
import { ActionHandlingComponentWrapper } from './ActionHandlingComponentWrapper';
import { AddressLookup } from './AddressLookupComponentWrapper';
import { PartialPaymentComponent } from './PartialPaymentsComponentWrapper';
import { RemovesStoredPayment } from './RemoveStoredPaymentComponentWrapper';

export class DropInComponentWrapper
  extends ActionHandlingComponentWrapper
  implements AddressLookup, RemovesStoredPayment, PartialPaymentComponent
{
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
  provideBalance(success: boolean, balance: Balance | undefined): void {
    this.nativeModule.provideBalance(success, balance);
  }
  provideOrder(success: boolean, order: Order | undefined): void {
    this.nativeModule.confirm(success, order);
  }
}
