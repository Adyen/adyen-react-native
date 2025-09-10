import { ResultCode, AdyenAction } from '@adyen/react-native';
import { Alert } from 'react-native';
import type {
  StoredCardPaymentMethod,
  PaymentConfiguration,
  PaymentResponse,
} from '../../../api/types';
import { isSuccess } from '../../utilities/isSuccess';
import { payByID } from './payByID';

export async function handleStoredPayment(
  p: StoredCardPaymentMethod,
  configuration: PaymentConfiguration
) {
  let result: PaymentResponse;
  try {
    let cvv = '737'; /** Collect CVV from shopper if nececery */
    result = await payByID(p.id, cvv, configuration);
    Alert.alert('Result', result.resultCode);
  } catch (e) {
    result = {
      resultCode: ResultCode.error,
    };
    Alert.alert('Error', String(e));
  }
  AdyenAction.hide(isSuccess(result.resultCode));
}
