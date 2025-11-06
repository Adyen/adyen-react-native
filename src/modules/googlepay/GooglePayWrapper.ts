import type { Configuration } from '../../core/configurations';
import type { PaymentMethod } from '../../core/types';
import type { GooglePayModule } from './AdyenGooglePay';
import { ActionHandlingComponentWrapper } from '../base/ActionHandlingComponentWrapper';

export class GooglePayWrapper
  extends ActionHandlingComponentWrapper
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
