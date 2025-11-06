import { ModuleWrapper } from '../base/ModuleWrapper';
import type { Configuration } from '../../core/configurations';
import type { PaymentMethod } from '../../core/types';
import type { ApplePayModule } from './AdyenApplePay';

export class ApplePayWrapper extends ModuleWrapper implements ApplePayModule {
  name: string = 'ApplePay';

  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean> {
    return this.nativeModule.isAvailable(paymentMethods, configuration);
  }
}
