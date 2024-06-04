import { NativeModule } from 'react-native';
import { ErrorCode, Event } from './core/constants';
import { PaymentAction, PaymentMethodsResponse } from './core/types';
import { AdyenActionComponent } from './AdyenNativeModules';

export interface AdyenNativeComponentWrapperProps {
  nativeModule: NativeModule;
  canHandleAction?: boolean;
  events?: string[];
}

/**
 *  Wrapper for all Native Modules that do not support Action handling.
 * */
export class AdyenNativeComponentWrapper implements AdyenActionComponent {
  canHandleAction: boolean;
  nativeModule: NativeModule | any;
  events: string[];

  constructor(prop: AdyenNativeComponentWrapperProps) {
    this.nativeModule = prop.nativeModule;
    this.canHandleAction = prop.canHandleAction ?? true;
    this.events = [Event.onError, Event.onSubmit, Event.onComplete];

    prop.events?.forEach((element: string) => this.events.push(element));

    if (this.canHandleAction) {
      this.events.push(Event.onAdditionalDetails);
    }
  }
  addListener(eventType: string) {
    this.nativeModule.addListener(eventType);
  }
  removeListeners(count: number) {
    this.nativeModule.removeListeners(count);
  }
  handle(action: PaymentAction) {
    if (this.canHandleAction) {
      this.nativeModule.handle(action);
    } else {
      throw Error(ErrorCode.notSupportedAction);
    }
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
