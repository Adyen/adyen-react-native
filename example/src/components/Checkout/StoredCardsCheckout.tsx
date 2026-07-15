import { useEffect, useCallback, useState } from 'react';
import { Text, ActivityIndicator, View, ScrollView } from 'react-native';
import type { PaymentMethodsResponse } from '@adyen/react-native';
import { AdyenAction } from '@adyen/react-native';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import StoredPaymentMethodsList from './components/StoredPaymentMethodsList';
import ApiClient from '../../api/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { processError } from './utils/processError';
import { payByID } from './utils/payByID';
import type { StoredCardPaymentMethod } from '../../api/types';

const StoredCardsCheckout = () => {
  const { configuration, processResult } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [initError, setError] = useState<string | undefined>(undefined);
  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethodsResponse | undefined
  >(undefined);

  useEffect(() => {
    const refreshPaymentMethods = async () => {
      try {
        const paymentMethodsResponse =
          await ApiClient.paymentMethods(configuration);
        setPaymentMethods(paymentMethodsResponse);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    refreshPaymentMethods();
  }, [configuration, setPaymentMethods, setLoading]);

  const makePayment = useCallback(
    async (storedCard: StoredCardPaymentMethod) => {
      try {
        const cvv = '737';
        const result = await payByID(storedCard.id, cvv, configuration);
        processResult(result, AdyenAction);
      } catch (e) {
        processError(e, AdyenAction);
      }
    },
    [configuration, processResult]
  );

  if (loading) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (initError) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>{initError}</Text>
      </View>
    );
  }

  if (!paymentMethods || paymentMethods.storedPaymentMethods?.length === 0) {
    return (
      <View style={Styles.centeredContent}>
        <Text>
          No stored payment methods available. Please add a card first.
        </Text>
      </View>
    );
  }

  return (
    <View style={Styles.page}>
      <TopView />
      <ScrollView>
        <StoredPaymentMethodsList
          storedPaymentMethods={paymentMethods.storedPaymentMethods}
          makePayment={makePayment}
        />
        <View style={Styles.scrollBottomPadding} />
      </ScrollView>
    </View>
  );
};

export default StoredCardsCheckout;
