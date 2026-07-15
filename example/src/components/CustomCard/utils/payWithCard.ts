import {
  AdyenCSE,
  AdyenAction,
  Card,
  type PaymentMethodData,
} from '@adyen/react-native';
import { ENVIRONMENT } from '../../../Configuration';
import type { ApiService } from '../../../api/ApiService';
import type { PaymentConfiguration } from '../../../api/types';

export async function payWithCard(
  unencryptedCard: Card,
  configuration: PaymentConfiguration,
  apiClient: ApiService
) {
  const encryptedCard = await AdyenCSE.encryptCard(
    unencryptedCard,
    ENVIRONMENT.publicKey
  );
  const paymentData: PaymentMethodData = {
    paymentMethod: {
      type: 'scheme',
      encryptedCardNumber: encryptedCard.number,
      encryptedExpiryMonth: encryptedCard.expiryMonth,
      encryptedExpiryYear: encryptedCard.expiryYear,
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
