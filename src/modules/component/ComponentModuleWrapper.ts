import type { AddressLookupItem, PaymentAction } from '../../core';
import { EventListenerWrapper } from '../base/EventListenerWrapper';
import type { ComponentNativeModule } from './AdyenComponentModule';

/**
 * Communication bus for all embedded component Native Modules.
 * Routes JS commands to the correct native view controller by `viewId`.
 */
export class ComponentModuleWrapper extends EventListenerWrapper<ComponentNativeModule> {
  name: string = 'AdyenComponent';

  subscribe(viewId: string): void {
    this.nativeModule.subscribe(viewId);
  }

  unsubscribe(viewId: string): void {
    this.nativeModule.unsubscribe(viewId);
  }

  action(viewId: string, action: PaymentAction): void {
    this.nativeModule.action(viewId, action);
  }

  completion(viewId: string, resultCode: string): void {
    this.nativeModule.completion(viewId, resultCode);
  }

  retry(viewId: string, message?: string): void {
    this.nativeModule.retry(viewId, message);
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
