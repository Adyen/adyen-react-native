import {
  AdyenCSE,
  AdyenAction,
  type PaymentResponse,
  type PaymentMethodData,
} from '@adyen/react-native';
import type { PaymentConfiguration } from '../../../api/types';
import { ENVIRONMENT } from '../../../Configuration';
import ApiClient from '../../../api/APIClient';
import { checkoutConfiguration } from '../../utilities/checkoutConfiguration';

export async function payByID(
  id: string,
  cvv: string,
  configuration: PaymentConfiguration
): Promise<PaymentResponse> {
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

  let result = await ApiClient.payments(paymentData, configuration);
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
