import { AdyenActionHandlingComponentWrapper } from './AdyenActionHandlingComponentWrapper';
import { AddressLookup, AddressLookupItem, PostalAddress } from "../core/configuration";
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
  reject() {
    this.nativeModule.confirm(false, null);
  }
}

export function isAddressLooker(object: AdyenComponent): object is AdyenAddressLookupComponentWrapper {
  return 'update' in object && 'confirm' in object && 'reject' in object;
}