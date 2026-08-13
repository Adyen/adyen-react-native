import { useEffect, useCallback, useMemo, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { AdyenCheckout, AdyenComponent } from '@adyen/react-native';
import type {
  Checkout,
  PaymentResult,
  PaymentSubmitResultHandler,
  PaymentAdditionalResultHandler,
  PaymentMethodData,
  PaymentDetailsData,
  AdyenError,
} from '@adyen/react-native';
import Styles from '../common/Styles';
import AdaptiveText from '../common/AdaptiveText';
import PageScrollView from '../common/PageScrollView';
import TopView from './components/TopView';
import AvailablePaymentComponent from './components/AvailablePaymentComponent';
import { useAppContext } from '../../hooks/useAppContext';
import { processAdyenError } from './utils/processAdyenError';
import { processError } from './utils/processError';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';

const AdvancedCheckout = () => {
  const { configuration, processResult, apiClient } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  const config = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );

  const didSubmit = useCallback(
    async (
      data: PaymentMethodData,
      nativeComponent: PaymentSubmitResultHandler
    ) => {
      try {
        const result = await apiClient.payments(
          data,
          configuration,
          data.returnUrl
        );
        if (result.action) {
          nativeComponent.action(result.action);
        } else {
          processResult(result, nativeComponent);
        }
      } catch (err) {
        processError(err, nativeComponent);
      }
    },
    [configuration, processResult, apiClient]
  );

  const didProvide = useCallback(
    async (
      data: PaymentDetailsData,
      nativeComponent: PaymentAdditionalResultHandler
    ) => {
      try {
        const result = await apiClient.paymentDetails(data);
        processResult(result, nativeComponent);
      } catch (err) {
        processError(err, nativeComponent);
      }
    },
    [processResult, apiClient]
  );

  const didComplete = useCallback(
    async (result: PaymentResult) => {
      processResult(result);
    },
    [processResult]
  );

  const didFail = useCallback(
    async (adyenError: AdyenError) => {
      processAdyenError(adyenError);
    },
    []
  );

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const paymentMethods =
          await apiClient.paymentMethods(configuration);
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
  }, [configuration, apiClient, config, didSubmit, didProvide, didComplete, didFail]);

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
