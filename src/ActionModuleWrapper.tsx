import { NativeModule } from 'react-native';
import { PaymentAction } from './core/types';
import { BaseConfiguration } from './core/configuration';
import { ActionModule } from './AdyenNativeModules';

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
