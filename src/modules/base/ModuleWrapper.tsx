import type { NativeModule } from 'react-native';
import { EventListenerWrapper } from './EventListenerWrapper';
import type { AdyenComponent } from '../../core/types';
import type { PaymentMethodsResponse } from '../../core/types';
import { Event } from '../../core/constants';

/**
 *  Base wrapper for non-embeded Native Modules.
 * */
export abstract class ModuleWrapper
  extends EventListenerWrapper
  implements AdyenComponent
{
  constructor(nativeModule: NativeModule, events: Event[]) {
    const allEvents = [Event.onError, Event.onComplete];
    events.forEach((element: Event) => allEvents.push(element));
    super(nativeModule, allEvents);
  }
  open(paymentMethods: PaymentMethodsResponse, configuration: any) {
    this.nativeModule.open(paymentMethods, configuration);
  }
  hide(success: boolean, option?: { message?: string }) {
    if (option?.message) {
      this.nativeModule.hide(success, option);
    } else {
      this.nativeModule.hide(success, { message: '' });
    }
  }
}
