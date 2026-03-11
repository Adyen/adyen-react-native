import { EmbeddedComponentBusWrapper } from './EmbeddedComponentBusWrapper';
import type { AddressLookupItem, PaymentAction } from '../../core';
import type { NativeModuleWithConstants } from '../base/EventListenerWrapper';
import { ModuleMock } from '../base/ModuleMock';
import { NativeModules } from 'react-native';

export interface EmbeddedNativeModule extends NativeModuleWithConstants {
  subscribe(componentType: string): void;
  unsubscribe(componentType: string): void;
  handle(componentType: string, action: PaymentAction): void;
  hide(
    componentType: string,
    success: boolean,
    option?: { message?: string }
  ): void;
  update(componentType: string, results: AddressLookupItem[]): void;
  confirm(
    componentType: string,
    success: boolean,
    body?: AddressLookupItem | { message?: string }
  ): void;
};

/** Communication bus for all embedded Native Modules. */
export const EmbeddedComponentBus = new EmbeddedComponentBusWrapper(
  NativeModules.AdyenComponentBus ?? ModuleMock
);