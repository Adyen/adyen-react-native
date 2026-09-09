import { useEffect, useCallback, useMemo, useState } from 'react';
import { Text, ActivityIndicator, View, Alert } from 'react-native';
import { AdyenCheckout, AdyenComponent } from '@adyen/react-native';
import {
  SubmitResult,
  AdditionalDetailsResult,
  type Checkout,
  type PaymentResult,
  type PaymentMethodData,
  type PaymentDetailsData,
  type AdyenError,
} from '@adyen/react-native';
import Styles from '../common/Styles';
import AdaptiveText from '../common/AdaptiveText';
import PageScrollView from '../common/PageScrollView';
import TopView from './components/TopView';
import AvailablePaymentComponent from './components/AvailablePaymentComponent';
import { useAppContext } from '../../hooks/useAppContext';
import { processAdyenError } from './utils/processAdyenError';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';

const AdvancedCheckout = () => {
  const { configuration, navigateToResults, apiClient } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  const config = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );

  const didSubmit = useCallback(
    async (data: PaymentMethodData): Promise<SubmitResult> => {
      try {
        const result = await apiClient.payments(
          data,
          configuration,
          data.returnUrl
        );
        if (result.action) {
          return SubmitResult.action(result.action);
        }
        return SubmitResult.completed(result.resultCode);
      } catch (err) {
        Alert.alert('Error', String(err));
        return SubmitResult.completed('Error');
      }
    },
    [configuration, apiClient]
  );

  const didProvide = useCallback(
    async (data: PaymentDetailsData): Promise<AdditionalDetailsResult> => {
      try {
        const result = await apiClient.paymentDetails(data);
        return AdditionalDetailsResult.completed(result.resultCode);
      } catch (err) {
        Alert.alert('Error', String(err));
        return AdditionalDetailsResult.completed('Error');
      }
    },
    [apiClient]
  );

  const didComplete = useCallback(
    async (result: PaymentResult) => {
      navigateToResults(result);
    },
    [navigateToResults]
  );

  const didFail = useCallback(async (adyenError: AdyenError) => {
    processAdyenError(adyenError);
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const paymentMethods = await apiClient.paymentMethods(configuration);
        const c = await AdyenCheckout.setupAdvanced(paymentMethods, config, {
          onSubmit: didSubmit,
          onAdditionalDetails: didProvide,
          onComplete: didComplete,
          onError: didFail,
        });
        if (active) {
          setCheckout(c);
        }
      } catch (e) {
        if (active) {
          setError(String(e));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [
    configuration,
    apiClient,
    config,
    didSubmit,
    didProvide,
    didComplete,
    didFail,
  ]);

  if (loading) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !checkout) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>
          {error ?? 'No payment methods available'}
        </Text>
      </View>
    );
  }

  return (
    <View style={Styles.page}>
      <TopView />
      <PageScrollView>
        <AdaptiveText style={Styles.paddedTitle}>Card</AdaptiveText>
        <AdyenComponent checkout={checkout} type="scheme" />
        <AvailablePaymentComponent checkout={checkout} type="applepay" />
        <AvailablePaymentComponent checkout={checkout} type="googlepay" />
      </PageScrollView>
    </View>
  );
};

export default AdvancedCheckout;
