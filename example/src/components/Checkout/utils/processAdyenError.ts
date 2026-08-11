import {
  type AdyenError,
  type PaymentResultHandler,
  ErrorCode,
} from '@adyen/react-native';
import { Alert } from 'react-native';

export function processAdyenError(
  error: AdyenError,
  nativeComponent: PaymentResultHandler
) {
  nativeComponent.completion('Error');
  if (error.errorCode === ErrorCode.canceled) {
    Alert.alert('Canceled');
  } else {
    Alert.alert('Error', error.message);
  }
}
