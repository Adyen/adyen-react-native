import { AdyenCSE, AdyenAction } from '@adyen/react-native';
import { ENVIRONMENT } from '../Configuration';
import ApiClient from './APIClient';
import { checkoutConfiguration } from './AppContext';
import { isSuccess } from './Helpers';

export async function payByID(id, cvv, configuration) {
  const encryptedCard = await AdyenCSE.encryptCard(
    { cvv: cvv },
    ENVIRONMENT.publicKey
  );
  const data = {
    paymentMethod: {
      type: 'scheme',
      storedPaymentMethodId: id,
      encryptedSecurityCode: encryptedCard.cvv,
      threeDS2SdkVersion: AdyenAction.threeDS2SdkVersion,
    },
  };

  var result = await ApiClient.payments(data, configuration, ENVIRONMENT.returnUrl);
  if (result.action) {
    const actionConfiguration = checkoutConfiguration(configuration);
    const data = await AdyenAction.handle(result.action, actionConfiguration);
    result = await ApiClient.paymentDetails(data);
  }
  AdyenAction.hide(isSuccess(result.resultCode));
  return result;
}
