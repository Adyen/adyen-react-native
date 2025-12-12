import type { PaymentAction } from '../../core/types';
import { ModuleWrapper, type BaseNativeModule } from './ModuleWrapper';
import type { AdyenActionComponent } from '../../core/types';
import { Event } from '../../core/constants';

/** Native module interface for action-handling components */
export interface ActionHandlingNativeModule extends BaseNativeModule {
  handle(action: PaymentAction): void;
}

/**
 *  Wrapper for all Native Modules that support Action handling.
 *  @typeParam T - The specific native module interface for the concrete wrapper
 * */
export abstract class ActionHandlingComponentWrapper<
    T extends ActionHandlingNativeModule = ActionHandlingNativeModule,
  >
  extends ModuleWrapper<T>
  implements AdyenActionComponent
{
  constructor(nativeModule: T, events?: Event[]) {
    const allEvents = [Event.onSubmit, Event.onAdditionalDetails];
    events?.forEach((element: Event) => allEvents.push(element));
    super(nativeModule, allEvents);
  }

  handle(action: PaymentAction) {
    this.nativeModule.handle(action);
  }
}
