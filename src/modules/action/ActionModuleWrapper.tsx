import type { NativeModule } from 'react-native';
import type { BaseConfiguration } from '../../core/configurations';
import type { PaymentAction, PaymentDetailsData } from '../../core/types';
import type { ActionModule } from './AdyenAction';

/** Native module interface specific to Action */
export interface ActionNativeModule extends NativeModule {
  handle(
    action: PaymentAction,
    configuration: BaseConfiguration
  ): Promise<PaymentDetailsData>;
  hide(success: boolean): void;
  getConstants(): { threeDS2SdkVersion: string };
}

export class ActionModuleWrapper implements ActionModule {
  private nativeModule: ActionNativeModule;

  public threeDS2SdkVersion: string;

  constructor(nativeModule: ActionNativeModule) {
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
