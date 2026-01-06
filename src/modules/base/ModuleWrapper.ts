import type { NativeModule } from 'react-native';
import type { AdyenComponent } from '../../core';
import { Event } from '../../core';
import { EventListenerWrapper } from './EventListenerWrapper';

/** Base native module interface for ModuleWrapper */
export interface BaseNativeModule extends NativeModule, AdyenComponent {
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
  hide(success: boolean, option?: { message?: string }) {
    if (option?.message) {
      this.nativeModule.hide(success, option);
    } else {
      this.nativeModule.hide(success, { message: '' });
    }
  }
}
