import type { Configuration } from '../../core/configurations';
import type { PaymentMethod } from '../../core/types';
import type { GooglePayModule } from './AdyenGooglePay';
import {
  ActionHandlingComponentWrapper,
  type ActionHandlingNativeModule,
} from '../base/ActionHandlingComponentWrapper';

/** Native module interface specific to GooglePay */
export interface GooglePayNativeModule extends ActionHandlingNativeModule {
  isAvailable(
    paymentMethod: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean>;
}

export class GooglePayWrapper
  extends ActionHandlingComponentWrapper<GooglePayNativeModule>
  implements GooglePayModule
{
  name: string = 'GooglePay';

  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean> {
    return this.nativeModule.isAvailable(paymentMethods, configuration);
  }
}
