import type { AdyenComponent } from '@adyen/react-native';
import { isSuccess } from '../../utilities/isSuccess';
import type { PageProps } from '../../../State/RootStackParamList';
import type { PaymentResponse } from '../../../api/types';

export function processResult(
  result: PaymentResponse,
  nativeComponent: AdyenComponent,
  navigation: PageProps['navigation']) {
  const success = isSuccess(result.resultCode);
  console.log(
    `Payment: ${success ? 'success' : 'failure'} : ${success ? result.resultCode : JSON.stringify(result)}`
  );
  nativeComponent.hide(success);
  navigation.popToTop();
  navigation.push('Result', { resultCode: result.resultCode });
}
