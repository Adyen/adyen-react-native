import type { NativeModule } from 'react-native';
import { Event } from '../core/constants';
import type { PaymentMethodsResponse } from '../core/types';
import type { AdyenComponent } from '../core/AdyenNativeModules';

/**
 *  Wrapper for all Native Modules that do not support Action handling.
 * */
export class ComponentWrapper implements AdyenComponent {
  nativeModule: NativeModule | any;
  events: string[];

  constructor(nativeModule: NativeModule, events?: Event[]) {
    this.nativeModule = nativeModule;
    this.events = [Event.onError, Event.onSubmit, Event.onComplete];
    events?.forEach((element: string) => this.events.push(element));
  }
  addListener(eventType: string) {
    this.nativeModule.addListener(eventType);
  }
  removeListeners(count: number) {
    this.nativeModule.removeListeners(count);
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
