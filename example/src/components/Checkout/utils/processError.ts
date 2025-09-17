import type { AdyenComponent } from '@adyen/react-native';
import { Alert } from 'react-native';

export function processError(error: unknown, nativeComponent: AdyenComponent) {
  nativeComponent.hide(false);
  Alert.alert('Error', String(error));
}
