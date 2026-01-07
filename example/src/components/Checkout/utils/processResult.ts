import type { AdyenComponent } from '@adyen/react-native';
import { isSuccess } from '../../utilities/isSuccess';
import type { PageProps } from '../../../State/RootStackParamList';
import type { PaymentResponse } from '../../../api/types';
import { InteractionManager } from 'react-native';

export function processResult(
  result: PaymentResponse,
  nativeComponent: AdyenComponent,
  navigation?: PageProps['navigation']
) {
  const success = isSuccess(result.resultCode);
  nativeComponent.hide(success);
  InteractionManager.runAfterInteractions(() => {
    navigation?.popToTop();
    navigation?.push('Result', { resultCode: result.resultCode });
  });
}
