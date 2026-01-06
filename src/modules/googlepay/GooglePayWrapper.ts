import type { Configuration, PaymentMethod } from '../../core';
import {
  ActionHandlingComponentWrapper,
  type ActionHandlingNativeModule,
} from '../base/ActionHandlingComponentWrapper';
import type { GooglePayModule } from './AdyenGooglePay';

/** Native module interface specific to GooglePay */
interface GooglePayNativeModule
  extends GooglePayModule, ActionHandlingNativeModule {}

/** Google Pay wrapper - no additional events beyond inherited ones. */
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
