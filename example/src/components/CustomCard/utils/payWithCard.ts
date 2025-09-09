import { AdyenCSE, AdyenAction, Card, type PaymentMethodData } from '@adyen/react-native';
import { ENVIRONMENT } from '../../../Configuration';
import ApiClient from '../../../api/APIClient';
import { checkoutConfiguration } from '../../../State/checkoutConfiguration';
import type { PaymentConfiguration } from '../../../api/types';

export async function payWithCard(unencryptedCard: Card, configuration: PaymentConfiguration) {
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
    returnUrl: ENVIRONMENT.returnUrl
  };

  let result = await ApiClient.payments(
    paymentData,
    configuration
  );
  if (result.action) {
    const actionConfiguration = checkoutConfiguration(configuration);
    const actionData = await AdyenAction.handle(
      result.action,
      actionConfiguration
    );
    result = await ApiClient.paymentDetails(actionData);
  }
  return result;
}
