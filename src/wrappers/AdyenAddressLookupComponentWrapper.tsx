import { AdyenActionHandlingComponentWrapper } from './AdyenActionHandlingComponentWrapper';
import { AddressLookup, AddressLookupItem } from '../core/configurations/AddressLookup';
import { AdyenComponent } from '../core/AdyenNativeModules';


export class AdyenAddressLookupComponentWrapper extends AdyenActionHandlingComponentWrapper implements AddressLookup {
  update(results: AddressLookupItem[]) {
    console.debug("--> Wrapper: Calling update");
    this.nativeModule.update(results);
  }
  confirm(address: AddressLookupItem) {
    console.debug("--> Wrapper: Calling confirm");
    this.nativeModule.confirm(true, address);
  }
  reject(error?: { message: string }) {
    this.nativeModule.confirm(false, error);
  }
}

export function isAddressLooker(object: AdyenComponent): object is AdyenAddressLookupComponentWrapper {
  return 'update' in object && 'confirm' in object && 'reject' in object;
}