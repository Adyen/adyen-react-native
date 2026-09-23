import type {
  BaseConfiguration,
  PaymentAction,
  PaymentDetailsData,
} from '../../core';
import type { ActionModule } from './AdyenAction';
import type { Spec as ActionNativeModule } from '../../specs/NativeAdyenAction';

export class ActionModuleWrapper implements ActionModule {
  private readonly nativeModule: ActionNativeModule;

  constructor(nativeModule: ActionNativeModule) {
    this.nativeModule = nativeModule;
  }

  async getThreeDS2SdkVersion(): Promise<string> {
    return this.nativeModule.getThreeDS2SdkVersion();
  }

  async handle(
    action: PaymentAction,
    configuration: BaseConfiguration
  ): Promise<PaymentDetailsData> {
    const result = await this.nativeModule.handle(
      JSON.stringify(action),
      JSON.stringify(configuration)
    );
    return JSON.parse(result) as PaymentDetailsData;
  }

  hide(): Promise<void> {
    return this.nativeModule.hide();
  }
}
