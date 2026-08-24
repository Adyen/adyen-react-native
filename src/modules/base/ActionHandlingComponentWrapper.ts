import type { PaymentAction } from '../../core';
import { ModuleWrapper, type BaseNativeModule } from './ModuleWrapper';

/** Native module interface for action-handling components */
export interface ActionHandlingNativeModule extends BaseNativeModule {
  handle(action: PaymentAction): void;
}

/**
 * Wrapper for Native Modules that support Action handling.
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class ActionHandlingComponentWrapper<
  T extends ActionHandlingNativeModule = ActionHandlingNativeModule,
> extends ModuleWrapper<T> {
  handle(action: PaymentAction) {
    this.nativeModule.handle(action);
  }
}
