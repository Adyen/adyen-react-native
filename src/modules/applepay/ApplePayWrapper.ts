import { ModuleWrapper } from '../base/ModuleWrapper';
import type { Configuration } from '../../core/configurations';
import type { PaymentMethod } from '../../core/types';
import type { ApplePayModule } from './AdyenApplePay';
import type { NativeModule } from 'react-native';
import { Event } from '../../core/constants';

export class ApplePayWrapper extends ModuleWrapper implements ApplePayModule {
  name: string = 'ApplePay';

  constructor(nativeModule: NativeModule) {
    super(nativeModule, [Event.onSubmit]);
  }

  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean> {
    return this.nativeModule.isAvailable(paymentMethods, configuration);
  }
}
