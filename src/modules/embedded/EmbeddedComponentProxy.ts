import type { NativeModule } from 'react-native';
import type {
  AdyenActionComponent,
  AddressLookup,
  AddressLookupItem,
  HideOption,
  PaymentAction,
  Event,
} from '../../core';
import type { AdyenEventListener } from '../base/EventListenerWrapper';
import type { EmbeddedComponentBusWrapper } from './EmbeddedComponentBusWrapper';

/**
 * Proxy that binds a componentType to all outbound native module calls.
 * Passed to merchant callbacks as the `component` argument so that
 * `component.handle(action)` routes to the correct embedded view.
 */
export class EmbeddedComponentProxy
  implements AdyenActionComponent, AddressLookup, AdyenEventListener
{
  constructor(
    private wrapper: EmbeddedComponentBusWrapper,
    readonly componentType: string
  ) {}

  isSupported(event: Event): boolean {
    return this.wrapper.isSupported(event);
  }
  get eventEmitterTarget(): NativeModule {
    return this.wrapper.eventEmitterTarget;
  }

  handle(action: PaymentAction) {
    this.wrapper.handle(this.componentType, action);
  }

  hide(success: boolean, option?: HideOption) {
    this.wrapper.hide(this.componentType, success, {
      message: option?.message ?? '',
    });
  }

  update(results: AddressLookupItem[]) {
    this.wrapper.update(this.componentType, results);
  }

  confirm(address: AddressLookupItem) {
    this.wrapper.confirm(this.componentType, true, address);
  }

  reject(error?: { message: string }) {
    this.wrapper.confirm(this.componentType, false, error);
  }
}
