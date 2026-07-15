import {
  AdyenCSE,
  AdyenAction,
  type PaymentMethodData,
} from '@adyen/react-native';
import type { PaymentConfiguration } from '../../../api/types';
import { ENVIRONMENT } from '../../../Configuration';
import type { ApiService } from '../../../api/ApiService';

export async function payByID(
  id: string,
  cvv: string,
  configuration: PaymentConfiguration,
  apiClient: ApiService
) {
  const encryptedCard = await AdyenCSE.encryptCard(
    { cvv },
    ENVIRONMENT.publicKey
  );
  const paymentData: PaymentMethodData = {
    paymentMethod: {
      type: 'scheme',
      storedPaymentMethodId: id,
      encryptedSecurityCode: encryptedCard.cvv,
      threeDS2SdkVersion: AdyenAction.threeDS2SdkVersion,
    },
    returnUrl: ENVIRONMENT.returnUrl,
  };

  let result = await apiClient.payments(paymentData, configuration);
  if (result.action) {
    const actionData = await AdyenAction.handle(result.action, {
      environment: ENVIRONMENT.environment,
      clientKey: ENVIRONMENT.clientKey,
    });

    result = await apiClient.paymentDetails(actionData);
  }
  return result;
}
