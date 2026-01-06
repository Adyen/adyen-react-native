import type { NativeModule } from 'react-native';
import type {
  AdyenComponent,
  Configuration,
  PaymentMethodsResponse,
} from '../../core';
import { Event } from '../../core';
import { EventListenerWrapper } from './EventListenerWrapper';

/** Base native module interface for ModuleWrapper */
export interface BaseNativeModule extends NativeModule {
  open(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration
  ): void;
  hide(success: boolean, option?: { message?: string }): void;
}

/**
 *  Base wrapper for non-embedded Native Modules.
 *  @typeParam T - The specific native module interface for the concrete wrapper
 * */
export abstract class ModuleWrapper<
  T extends BaseNativeModule = BaseNativeModule,
>
  extends EventListenerWrapper<T>
  implements AdyenComponent
{
  constructor(nativeModule: T, events: Event[]) {
    const allEvents = [Event.onError, Event.onComplete];
    events.forEach((element: Event) => allEvents.push(element));
    super(nativeModule, allEvents);
  }
  open(paymentMethods: PaymentMethodsResponse, configuration: Configuration) {
    this.nativeModule.open(paymentMethods, configuration);
  }
  hide(success: boolean, option?: { message?: string }) {
    if (option?.message) {
      this.nativeModule.hide(success, option);
    } else {
      this.nativeModule.hide(success, { message: '' });
    }
  }
}
