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
  extends PaymentModule, AdyenActionComponent {
  handle(action: PaymentAction): void;
}

/**
 *  Wrapper for all Native Modules that support Action handling.
 *  @typeParam T - The specific native module interface for the concrete wrapper
 * */
export abstract class ActionHandlingComponentWrapper<
  T extends ActionHandlingNativeModule = ActionHandlingNativeModule,
>
  extends PaymentComponentWrapper<T>
  implements AdyenActionComponent
{
  constructor(nativeModule: T, events?: Event[]) {
    const allEvents = [Event.onAdditionalDetails];
    events?.forEach((element: Event) => allEvents.push(element));
    super(nativeModule, allEvents);
  }

  handle(action: PaymentAction) {
    this.nativeModule.handle(action);
  }
}
