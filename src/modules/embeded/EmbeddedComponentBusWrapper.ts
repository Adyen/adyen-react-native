import type { AddressLookupItem, PaymentAction } from '../../core';
import { EventListenerWrapper } from '../base/EventListenerWrapper';
import type { EmbeddedNativeModule } from './EmbeddedComponentBus';

/**
 *  Communication bus for all embedded Native Modules.
 * */
export class EmbeddedComponentBusWrapper extends EventListenerWrapper<EmbeddedNativeModule> {
  name: string = 'AdyenComponentBus';

    subscribe(componentType: string): void {
      this.nativeModule.subscribe(componentType);
    }

    unsubscribe(componentType: string): void {
      this.nativeModule.unsubscribe(componentType);
    }

    handle(componentType: string, action: PaymentAction): void {
      this.nativeModule.handle(componentType, action);
    }

    hide(
      componentType: string,
      success: boolean,
      option?: { message?: string }
    ): void {
      this.nativeModule.hide(componentType, success, option);
    }

    update(componentType: string, results: AddressLookupItem[]): void {
      this.nativeModule.update(componentType, results);
    }

    confirm(
      componentType: string,
      success: boolean,
      body?: AddressLookupItem | { message?: string }
    ): void {
      this.nativeModule.confirm(componentType, success, body);
    }

}
