import type {
  Configuration,
  PaymentAction,
  PaymentDetailsData,
} from '../../core';
import { asCheckoutError } from '../../checkout/errors';
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
    configuration: Configuration
  ): Promise<PaymentDetailsData> {
    try {
      const result = await this.nativeModule.handle(
        JSON.stringify(action),
        JSON.stringify(configuration)
      );
      return JSON.parse(result) as PaymentDetailsData;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        (error as { code?: unknown }).code === 'unsupportedCapability'
      ) {
        throw asCheckoutError(error, 'presentation');
      }
      throw error;
    }
  }

  hide(): Promise<void> {
    return this.nativeModule.hide();
  }
}
