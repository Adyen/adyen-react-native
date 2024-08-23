import { AddressLookupItem } from '../core/configurations/AddressLookup';
import { ActionHandlingComponentWrapper } from './ActionHandlingComponentWrapper';
import { AddressLookup } from './AddressLookupComponentWrapper';
import { RemovesStoredPayment } from './RemoveStoredPaymentComponentWrapper';

export class DropInComponentWrapper
  extends ActionHandlingComponentWrapper
  implements AddressLookup, RemovesStoredPayment
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
}
