import { EmbeddedComponentBusWrapper } from './EmbeddedComponentBusWrapper';
import type { AddressLookupItem, PaymentAction } from '../../core';
import type { NativeModuleWithConstants } from '../base/EventListenerWrapper';
import { ModuleMock } from '../base/ModuleMock';
import { NativeModules } from 'react-native';

export interface EmbeddedNativeModule extends NativeModuleWithConstants {
  subscribe(viewId: string): void;
  unsubscribe(viewId: string): void;
  submit(viewId: string): void;
  handle(viewId: string, action: PaymentAction): void;
  hide(viewId: string, success: boolean, option?: { message?: string }): void;
  update(viewId: string, results: AddressLookupItem[]): void;
  confirm(
    viewId: string,
    success: boolean,
    body?: AddressLookupItem | { message?: string }
  ): void;
}

/** Communication bus for all embedded Native Modules. */
export const EmbeddedComponentBus = new EmbeddedComponentBusWrapper(
  NativeModules.AdyenComponentBus ?? ModuleMock
);
