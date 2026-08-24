import { NativeModules } from 'react-native';
import type { AddressLookupItem, PaymentAction } from '../../core';
import type { NativeModuleWithConstants } from '../base/EventListenerWrapper';
import { ModuleMock } from '../base/ModuleMock';
import { ComponentModuleWrapper } from './ComponentModuleWrapper';

export interface ComponentNativeModule extends NativeModuleWithConstants {
  subscribe(viewId: string): void;
  unsubscribe(viewId: string): void;
  action(viewId: string, action: PaymentAction): void;
  completion(viewId: string, resultCode: string): void;
  retry(viewId: string, message?: string): void;
  update(viewId: string, results: AddressLookupItem[]): void;
  confirm(
    viewId: string,
    success: boolean,
    body?: AddressLookupItem | { message?: string }
  ): void;
}

/** Communication bus for all embedded component Native Modules. */
export const AdyenComponent = new ComponentModuleWrapper(
  NativeModules.AdyenComponent ?? ModuleMock
);
