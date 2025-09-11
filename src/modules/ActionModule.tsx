import { type NativeModule, NativeModules } from 'react-native';
import type { PaymentAction, PaymentDetailsData } from '../core/types';
import type { BaseConfiguration } from '../core/configurations/Configuration';
import type { AdyenComponent } from '../core/AdyenNativeModules';

/** Describes a native module capable of handling actions standalone. */
export interface ActionModule extends AdyenComponent {
  /** Returns current version of 3DS2 library */
  threeDS2SdkVersion: string;

  /**
   * Handle a payment action received from Adyen API.
   * @param action - The payment action to be handled.
   */
  handle: (
    action: PaymentAction,
    configuration: BaseConfiguration
  ) => Promise<PaymentDetailsData>;

  /**
   * Dismiss the component from the screen.
   * @param success - Indicates whether the component was dismissed successfully.
   */
  hide: (success: boolean) => void;
}

export class ActionModuleWrapper implements ActionModule {
  nativeModule: NativeModule | any;
  public threeDS2SdkVersion: string;

  constructor(nativeModule: NativeModule | any) {
    this.nativeModule = nativeModule;
    this.threeDS2SdkVersion = nativeModule.getConstants().threeDS2SdkVersion;
  }

  handle(action: PaymentAction, configuration: BaseConfiguration) {
    return this.nativeModule.handle(action, configuration);
  }

  hide(success: boolean) {
    this.nativeModule.hide(success);
  }
}

/** Standalone Action Handling module. */
export const AdyenAction: ActionModule = new ActionModuleWrapper(
  NativeModules.AdyenAction
);
