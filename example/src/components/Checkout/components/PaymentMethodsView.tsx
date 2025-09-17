import { useAdyenCheckout } from '@adyen/react-native';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import Styles from '../../common/Styles';
import { useAppContext } from '../../../hooks/useAppContext';
import type { StoredCardPaymentMethod } from '../../../api/types';
import { handleStoredPayment } from '../utils/handleStoredPayment';
import type { PageProps } from '../../../State/RootStackParamList';
import { useCallback } from 'react';
import StoredPaymentMethodsList from './StoredPaymentMethodsList';
import PaymentMethodsList from './PaymentMethodsList';
import DropInButton from './DropInButton';

interface PaymentMethodsProps {
  showComponents: boolean;
  navigation?: PageProps['navigation'];
}

const PaymentMethods = ({
  showComponents,
  navigation,
}: PaymentMethodsProps) => {
  const { configuration } = useAppContext();
  const { isReady, paymentMethods } = useAdyenCheckout();

  const makePayment = useCallback(
    async (storedCard: StoredCardPaymentMethod) => {
      await handleStoredPayment(storedCard, configuration, navigation);
    },
    [configuration, navigation]
  );

  if (!isReady) {
    return <ActivityIndicator />;
  }

  return (
    <ScrollView>
      <DropInButton />

      {showComponents && (
        <>
          <StoredPaymentMethodsList
            storedPaymentMethods={paymentMethods?.storedPaymentMethods}
            makePayment={makePayment}
          />

          <PaymentMethodsList paymentMethods={paymentMethods?.paymentMethods} />
        </>
      )}

      <View style={Styles.scrollBottomPadding} />
    </ScrollView>
  );
};

export default PaymentMethods;
