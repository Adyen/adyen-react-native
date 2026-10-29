import type { AddressLookupItem, PaymentAction } from '../../core';
import { EventListenerWrapper } from '../base/EventListenerWrapper';
import type { EmbeddedNativeModule } from './EmbeddedComponentBus';

/**
 *  Communication bus for all embedded Native Modules.
 * */
export class EmbeddedComponentBusWrapper extends EventListenerWrapper<EmbeddedNativeModule> {
  name: string = 'AdyenComponentBus';

  subscribe(viewId: string): void {
    this.nativeModule.subscribe(viewId);
  }

  unsubscribe(viewId: string): void {
    this.nativeModule.unsubscribe(viewId);
  }

  submit(viewId: string): void {
    this.nativeModule.submit(viewId);
  }

  handle(viewId: string, action: PaymentAction): void {
    this.nativeModule.handle(viewId, action);
  }

  hide(viewId: string, success: boolean, option?: { message?: string }): void {
    this.nativeModule.hide(viewId, success, option);
  }

  update(viewId: string, results: AddressLookupItem[]): void {
    this.nativeModule.update(viewId, results);
  }

  confirm(
    viewId: string,
    success: boolean,
    body?: AddressLookupItem | { message?: string }
  ): void {
    this.nativeModule.confirm(viewId, success, body);
  }
}
