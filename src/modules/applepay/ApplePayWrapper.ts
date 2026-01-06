import type {
  ConditionalPaymentComponent,
  Configuration,
  PaymentMethod,
} from '../../core';
import {
  PaymentComponentWrapper,
  type PaymentModule,
} from '../base/PaymentComponentWrapper';
import type { ApplePayModule } from './AdyenApplePay';

/** Native module interface specific to ApplePay */
export interface ApplePayNativeModule
  extends PaymentModule, ConditionalPaymentComponent {
  isAvailable(
    paymentMethod: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean>;
}

export class ApplePayWrapper
  extends PaymentComponentWrapper<ApplePayNativeModule>
  implements ApplePayModule
{
  name: string = 'ApplePay';

  constructor(nativeModule: ApplePayNativeModule) {
    super(nativeModule, []);
  }

  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean> {
    return this.nativeModule.isAvailable(paymentMethods, configuration);
  }
}
