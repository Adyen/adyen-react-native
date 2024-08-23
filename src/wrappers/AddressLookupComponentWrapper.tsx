import { AddressLookupItem } from '../core/configurations/AddressLookup';
import { AdyenComponent } from '../core/AdyenNativeModules';
import { ComponentWrapper } from './ComponentWrapper';

export interface AddressLookup {
  update(results: AddressLookupItem[]): void;
  confirm(address: AddressLookupItem): void;
  reject(error?: { message: string }): void;
}

export function isAddressLooker(
  object: AdyenComponent
): object is ComponentWrapper {
  return 'update' in object && 'confirm' in object && 'reject' in object;
}
