import type { AdyenComponent, HideOption } from '../../core';
import { EventListenerWrapper } from './EventListenerWrapper';
import type { NativeModuleWithConstants } from './EventListenerWrapper';

/** Base native module interface for ModuleWrapper */
export interface BaseNativeModule extends NativeModuleWithConstants {
  hide(success: boolean, option?: { message?: string }): void;
}

/**
 * Base wrapper for non-embedded Native Modules.
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class ModuleWrapper<
  T extends BaseNativeModule
>
  extends EventListenerWrapper<T>
  implements AdyenComponent
{
  hide(success: boolean, option?: HideOption): void {
    this.nativeModule.hide(success, { message: option?.message ?? '' });
  }
}
