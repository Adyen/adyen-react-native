import { useAdyenCheckout, AdyenAction } from '@adyen/react-native';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import Styles from '../../common/Styles';
import { useAppContext } from '../../../hooks/useAppContext';
import type { StoredCardPaymentMethod } from '../../../api/types';
import { useCallback } from 'react';
import StoredPaymentMethodsList from './StoredPaymentMethodsList';
import PaymentMethodsList from './PaymentMethodsList';
import DropInButton from './DropInButton';
import PlatformPayButton from './PlatformPayButton';
import { processError } from '../utils/processError';
import { payByID } from '../utils/payByID';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckoutStackParamList } from '../../../router/CheckoutNavigator';
import PaymentMethodListItem from './PaymentMethodListItem';

export type PaymentMethodsProps = NativeStackScreenProps<
  CheckoutStackParamList,
  'PaymentMethods'
>;

const PaymentMethods = (prop: PaymentMethodsProps) => {
  const { configuration, processResult } = useAppContext();
  const { isReady, paymentMethods } = useAdyenCheckout();

  const showComponents = prop.route.params?.showComponents ?? false;

  const makePayment = useCallback(
    async (storedCard: StoredCardPaymentMethod) => {
      let result: PaymentResponse;
      try {
        let cvv = '737'; /** Collect CVV from shopper if nececery */
        result = await payByID(storedCard.id, cvv, configuration);
        processResult(result, AdyenAction);
      } catch (e) {
        processError(e, AdyenAction);
      }
    },
    [configuration, processResult]
  );

  if (!isReady) {
    return <ActivityIndicator />;
  }

  return (
    <ScrollView>
      <DropInButton />

      {showComponents && paymentMethods && (
        <>
          <PlatformPayButton />

          <PaymentMethodListItem
            title="Card Component"
            icon="card"
            onPress={() => prop.navigation.navigate('CardForm')}
          />

          <StoredPaymentMethodsList
            storedPaymentMethods={paymentMethods.storedPaymentMethods}
            makePayment={makePayment}
          />

          <PaymentMethodsList paymentMethods={paymentMethods.paymentMethods} />
        </>
      )}

      <View style={Styles.scrollBottomPadding} />
    </ScrollView>
  );
};

export default PaymentMethods;
