import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import {
  AdyenCheckout,
  AdyenComponent,
  useAdyenCheckout,
} from '@adyen/react-native';
import type {
  AdvancedCallbacks,
  PaymentResultHandler,
  PaymentSubmitResultHandler,
  PaymentAdditionalResultHandler,
  PaymentMethodsResponse,
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

interface AdvancedCheckoutContentProps {
  paymentMethods: PaymentMethodsResponse;
  callbacks: AdvancedCallbacks;
}

const AdvancedCheckoutContent = ({
  paymentMethods,
  callbacks,
}: AdvancedCheckoutContentProps) => {
  const { setupAdvanced, checkout } = useAdyenCheckout();
  const [setupError, setSetupError] = useState<string | undefined>(undefined);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    setupAdvanced(paymentMethods, callbacks).catch((e) =>
      setSetupError(String(e))
    );
  }, [setupAdvanced, paymentMethods, callbacks]);

  if (setupError) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>{setupError}</Text>
      </View>
    );
  }

  if (!checkout) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PageScrollView>
      <AdaptiveText style={Styles.paddedTitle}>Card</AdaptiveText>
      <AdyenComponent checkout={checkout} type="scheme" />
      <AvailablePaymentComponent checkout={checkout} type="applepay" />
      <AvailablePaymentComponent checkout={checkout} type="googlepay" />
    </PageScrollView>
  );
};

const AdvancedCheckout = () => {
  const { configuration, processResult, apiClient } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [initError, setError] = useState<string | undefined>(undefined);
  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethodsResponse | undefined
  >(undefined);

  useEffect(() => {
    const refreshPaymentMethods = async () => {
      try {
        const paymentMethodsResponse =
          await apiClient.paymentMethods(configuration);
        setPaymentMethods(paymentMethodsResponse);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    refreshPaymentMethods();
  }, [configuration, apiClient]);

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
      } catch (error) {
        processError(error, nativeComponent);
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
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [processResult, apiClient]
  );

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: PaymentResultHandler) => {
      processAdyenError(error, nativeComponent);
    },
    []
  );

  const callbacks = useMemo<AdvancedCallbacks>(
    () => ({
      onSubmit: didSubmit,
      onAdditionalDetails: didProvide,
      onError: didFail,
    }),
    [didSubmit, didProvide, didFail]
  );

  const config = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );

  if (loading) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (initError || !paymentMethods) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>
          {initError ?? 'No payment methods available'}
        </Text>
      </View>
    );
  }

  return (
    <View style={Styles.page}>
      <TopView />
      <AdyenCheckout configuration={config}>
        <AdvancedCheckoutContent
          paymentMethods={paymentMethods}
          callbacks={callbacks}
        />
      </AdyenCheckout>
    </View>
  );
};

export default AdvancedCheckout;
