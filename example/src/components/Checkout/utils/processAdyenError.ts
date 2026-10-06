import { type AdyenError, ErrorCode } from '@adyen/react-native';
import { Alert } from 'react-native';

export function processAdyenError(error: AdyenError) {
  if (error.errorCode === ErrorCode.canceled) {
    Alert.alert('Canceled');
  } else {
    Alert.alert('Error', error.message);
  }
}
