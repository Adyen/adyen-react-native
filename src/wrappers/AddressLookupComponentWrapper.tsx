import type { AddressLookupItem } from '../core/configurations/AddressLookup';

export interface AddressLookup {
  update(results: AddressLookupItem[]): void;
  confirm(address: AddressLookupItem): void;
  reject(error?: { message: string }): void;
}
