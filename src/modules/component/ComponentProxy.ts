import type {
  AddressLookup,
  AddressLookupItem,
  AdvancedPayment,
  PaymentAction,
  Event,
} from '../../core';
import type {
  AdyenEventListener,
  NativeModule,
} from '../base/EventListenerWrapper';
import type { ComponentModuleWrapper } from './ComponentModuleWrapper';

/**
 * Proxy that binds a viewId to all outbound native module calls.
 * Used internally to route `action()`, `completion()`, and `retry()`
 * calls to the correct embedded view.
 */
export class ComponentProxy
  implements AddressLookup, AdyenEventListener, AdvancedPayment
{
  constructor(
    private readonly wrapper: ComponentModuleWrapper,
    readonly viewId: string
  ) {}

  isSupported(event: Event): boolean {
    return this.wrapper.isSupported(event);
  }
  get eventEmitterTarget(): NativeModule {
    return this.wrapper.eventEmitterTarget;
  }

  action(action: PaymentAction) {
    this.wrapper.action(this.viewId, action);
  }

  completion(resultCode: string) {
    this.wrapper.completion(this.viewId, resultCode);
  }

  retry(message?: string) {
    this.wrapper.retry(this.viewId, message);
  }

  update(results: AddressLookupItem[]) {
    this.wrapper.update(this.viewId, results);
  }

  confirm(address: AddressLookupItem) {
    this.wrapper.confirm(this.viewId, true, address);
  }

  reject(error?: { message: string }) {
    this.wrapper.confirm(this.viewId, false, error);
  }
}
