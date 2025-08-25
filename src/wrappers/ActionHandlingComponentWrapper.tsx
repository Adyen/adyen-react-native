import type { PaymentAction } from '../core/types';
import { ComponentWrapper } from './ComponentWrapper';
import type { AdyenActionComponent } from '../core/AdyenNativeModules';
import type { NativeModule } from 'react-native';
import { Event } from '../core/constants';

/**
 *  Wrapper for all Native Modules that support Action handling.
 * */
export class ActionHandlingComponentWrapper
  extends ComponentWrapper
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
