import { NativeModule } from 'react-native';
import { Event } from '../core/constants';
import { PaymentMethodsResponse } from '../core/types';
import { AdyenComponent } from '../core/AdyenNativeModules';

export interface ComponentWrapperProps {
  nativeModule: NativeModule;
  events?: string[];
}

/**
 *  Wrapper for all Native Modules that do not support Action handling.
 * */
export class ComponentWrapper implements AdyenComponent {
  nativeModule: NativeModule | any;
  events: string[];

  constructor(prop: ComponentWrapperProps) {
    this.nativeModule = prop.nativeModule;
    this.events = [Event.onError, Event.onSubmit, Event.onComplete];

    prop.events?.forEach((element: string) => this.events.push(element));
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
