import {
  type AdyenError,
  type AdyenComponent,
  ErrorCode,
} from '@adyen/react-native';
import { Alert } from 'react-native';

export function processAdyenError(
  error: AdyenError,
  nativeComponent: AdyenComponent
) {
  nativeComponent.hide(false);
  if (error.errorCode === ErrorCode.canceled) {
    Alert.alert('Canceled');
  } else {
    Alert.alert('Error', error.message);
  }
}
