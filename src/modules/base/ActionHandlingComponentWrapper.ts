import {
  Event,
  type AdyenActionComponent,
  type PaymentAction,
} from '../../core';
import {
  PaymentComponentWrapper,
  type PaymentModule,
} from './PaymentComponentWrapper';

/** Native module interface for action-handling components */
export interface ActionHandlingNativeModule
  extends PaymentModule, AdyenActionComponent {}

/**
 * Wrapper for Native Modules that support Action handling.
 * Supports: onAdditionalDetails event (in addition to inherited events).
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class ActionHandlingComponentWrapper<
  T extends ActionHandlingNativeModule = ActionHandlingNativeModule,
>
  extends PaymentComponentWrapper<T>
  implements AdyenActionComponent
{
  static readonly events = [Event.onAdditionalDetails];

  handle(action: PaymentAction) {
    this.nativeModule.handle(action);
  }
}
