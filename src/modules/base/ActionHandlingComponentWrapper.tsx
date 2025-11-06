import type { PaymentAction } from '../../core/types';
import { ModuleWrapper } from './ModuleWrapper';
import type { AdyenActionComponent } from '../../core/types';
import type { NativeModule } from 'react-native';
import { Event } from '../../core/constants';

/**
 *  Wrapper for all Native Modules that support Action handling.
 * */
export abstract class ActionHandlingComponentWrapper
  extends ModuleWrapper
  implements AdyenActionComponent
{
  constructor(nativeModule: NativeModule, events?: Event[]) {
    const allEvents = [Event.onAdditionalDetails];
    events?.forEach((element: Event) => allEvents.push(element));
    super(nativeModule, allEvents);
  }

  handle(action: PaymentAction) {
    this.nativeModule.handle(action);
  }
}
