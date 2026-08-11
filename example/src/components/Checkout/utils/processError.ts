import type { PaymentResultHandler } from '@adyen/react-native';
import { Alert } from 'react-native';

export function processError(
  error: unknown,
  nativeComponent: PaymentResultHandler
) {
  nativeComponent.completion('Error');
  Alert.alert('Error', String(error));
}
