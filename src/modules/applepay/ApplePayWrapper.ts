import { ModuleWrapper, type BaseNativeModule } from '../base/ModuleWrapper';
import type { Configuration } from '../../core/configurations';
import type { PaymentMethod } from '../../core/types';
import type { ApplePayModule } from './AdyenApplePay';
import { Event } from '../../core/constants';

/** Native module interface specific to ApplePay */
export interface ApplePayNativeModule extends BaseNativeModule {
  isAvailable(
    paymentMethod: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean>;
}

export class ApplePayWrapper
  extends ModuleWrapper<ApplePayNativeModule>
  implements ApplePayModule
{
  name: string = 'ApplePay';

  constructor(nativeModule: ApplePayNativeModule) {
    super(nativeModule, [Event.onSubmit]);
  }

  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean> {
    return this.nativeModule.isAvailable(paymentMethods, configuration);
  }
}
