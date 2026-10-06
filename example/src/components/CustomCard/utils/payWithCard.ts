import {
  AdyenCSE,
  AdyenAction,
  Card,
  type PaymentMethodData,
} from '@adyen/react-native';
import { ENVIRONMENT } from '../../../Configuration';
import type { AdvancedApiService } from '../../../api/ApiService';
import type { PaymentConfiguration } from '../../../api/types';

export async function payWithCard(
  unencryptedCard: Card,
  configuration: PaymentConfiguration,
  advancedApi: AdvancedApiService
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
      threeDS2SdkVersion: await AdyenAction.getThreeDS2SdkVersion(),
    },
    returnUrl: `${ENVIRONMENT.returnUrl}/action`,
  };

  let result = await advancedApi.payments(paymentData, configuration);
  if (result.action) {
    const actionData = await AdyenAction.handle(result.action, {
      environment: ENVIRONMENT.environment,
      clientKey: ENVIRONMENT.clientKey,
      returnUrl: `${ENVIRONMENT.returnUrl}/action`,
    });
    result = await advancedApi.paymentDetails(actionData);
  }
  return result;
}
