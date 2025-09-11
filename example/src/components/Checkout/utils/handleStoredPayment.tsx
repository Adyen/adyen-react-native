import { ResultCode, AdyenAction } from '@adyen/react-native';
import type {
  StoredCardPaymentMethod,
  PaymentConfiguration,
  PaymentResponse,
} from '../../../api/types';
import { payByID } from './payByID';
import { processResult } from './processResult';
import type { PageProps } from '../../../State/RootStackParamList';
import { processError } from './processError';

export async function handleStoredPayment(
  p: StoredCardPaymentMethod,
  configuration: PaymentConfiguration,
  navigation?: PageProps['navigation']
) {
  let result: PaymentResponse;
  try {
    let cvv = '737'; /** Collect CVV from shopper if nececery */
    result = await payByID(p.id, cvv, configuration);
    processResult(result, AdyenAction, navigation);
  } catch (e) {
    result = {
      resultCode: ResultCode.error,
    };
    processError(e, AdyenAction);
  }
}
