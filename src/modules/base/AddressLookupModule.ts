import type { AddressLookup, AddressLookupItem } from '../../core';
import {
  ActionHandlingComponentWrapper,
  type ActionHandlingNativeModule,
} from './ActionHandlingComponentWrapper';

/** Native module interface for address-lookup-capable components */
export interface AddressLookupNativeModule extends ActionHandlingNativeModule {
  update(results: AddressLookupItem[]): void;
  confirm(
    success: boolean,
    body?: AddressLookupItem | { message?: string }
  ): void;
}

/**
 * Abstract wrapper for Native Modules that support Address Lookup.
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class AddressLookupModule<
  T extends AddressLookupNativeModule = AddressLookupNativeModule,
>
  extends ActionHandlingComponentWrapper<T>
  implements AddressLookup
{
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
