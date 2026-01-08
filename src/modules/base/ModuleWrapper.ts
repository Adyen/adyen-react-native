import type { NativeModule } from 'react-native';
import type { AdyenComponent, HideOption } from '../../core';
import { Event } from '../../core';
import { EventListenerWrapper } from './EventListenerWrapper';

/** Base native module interface for ModuleWrapper */
export interface BaseNativeModule extends NativeModule {
  hide(success: boolean, option?: { message?: string }): void;
}

/**
 * Base wrapper for non-embedded Native Modules.
 * Supports: onError, onComplete events.
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class ModuleWrapper<
  T extends BaseNativeModule = BaseNativeModule,
>
  extends EventListenerWrapper<T>
  implements AdyenComponent
{
  static readonly events = [Event.onError, Event.onComplete];

  hide(success: boolean, option?: HideOption): void {
    this.nativeModule.hide(success, { message: option?.message ?? '' });
  }
}
