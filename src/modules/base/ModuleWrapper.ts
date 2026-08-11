import type { PaymentAction, PaymentSubmitResultHandler } from '../../core';
import { EventListenerWrapper } from './EventListenerWrapper';
import type { NativeModuleWithConstants } from './EventListenerWrapper';

/** Base native module interface for ModuleWrapper */
export interface BaseNativeModule extends NativeModuleWithConstants {
  action(action: PaymentAction): void;
  completion(resultCode: string): void;
  retry(message?: string): void;
}

/**
 * Base wrapper for non-embedded Native Modules.
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class ModuleWrapper<T extends BaseNativeModule>
  extends EventListenerWrapper<T>
  implements PaymentSubmitResultHandler
{
  action(action: PaymentAction): void {
    this.nativeModule.action(action);
  }

  completion(resultCode: string): void {
    this.nativeModule.completion(resultCode);
  }

  retry(message?: string): void {
    this.nativeModule.retry(message);
  }
}
