import { AdyenCSE, AdyenAction } from '@adyen/react-native';
import { ENVIRONMENT } from '../Configuration';
import ApiClient from './APIClient';
import { checkoutConfiguration } from './AppContext';
import { isSuccess } from './Helpers';

export async function payByID(id, cvv, configuration) {
  const encryptedCard = await AdyenCSE.encryptCard(
    { cvv },
    ENVIRONMENT.publicKey
  );
  const paymentData = {
    paymentMethod: {
      type: 'scheme',
      storedPaymentMethodId: id,
      encryptedSecurityCode: encryptedCard.cvv,
      threeDS2SdkVersion: AdyenAction.threeDS2SdkVersion,
    },
  };

  let result = await ApiClient.payments(
    paymentData,
    configuration,
    ENVIRONMENT.returnUrl
  );
  if (result.action) {
    const actionConfiguration = checkoutConfiguration(configuration);
    const actionData = await AdyenAction.handle(result.action, actionConfiguration);
    result = await ApiClient.paymentDetails(actionData);
  }
  AdyenAction.hide(isSuccess(result.resultCode));
  return result;
}
