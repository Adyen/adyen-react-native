import { useEffect, useCallback, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { AdyenCheckout } from '@adyen/react-native';
import type {
  AdyenActionComponent,
  PaymentMethodsResponse,
  PaymentMethodData,
  PaymentDetailsData,
  AdyenError,
  AdyenComponent,
} from '@adyen/react-native';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import ApiClient from '../../api/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { processAdyenError } from './utils/processAdyenError';
import { processError } from './utils/processError';
import { PaymentResponse } from '../../api/types';
import { CheckoutNavigator } from '../../router/CheckoutNavigator';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';

const AdvancedCheckout = () => {
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

  const didSubmit = useCallback(
    async (
      data: PaymentMethodData,
      nativeComponent: AdyenActionComponent,
      _extra: any // extra info for Apple and Google Pay
    ) => {
      try {
        const result = await ApiClient.payments(
          data,
          configuration,
          data.returnUrl
        );
        if (result.action) {
          nativeComponent.handle(result.action);
        } else {
          processResult(result, nativeComponent);
        }
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [configuration, processResult]
  );

  const didProvide = useCallback(
    async (data: PaymentDetailsData, nativeComponent: AdyenActionComponent) => {
      try {
        const result = await ApiClient.paymentDetails(data);
        processResult(result, nativeComponent);
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [processResult]
  );

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenComponent) => {
      processAdyenError(error, nativeComponent);
    },
    []
  );

  const didComplete = useCallback(
    async (result: PaymentResponse, nativeComponent: AdyenComponent) => {
      processResult(result, nativeComponent);
    },
    [processResult]
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

  return (
    <View style={Styles.page}>
      <TopView />
      <AdyenCheckout
        config={checkoutConfiguration(configuration)}
        paymentMethods={paymentMethods}
        onSubmit={didSubmit}
        onAdditionalDetails={didProvide}
        onComplete={didComplete}
        onError={didFail}
      >
        <CheckoutNavigator
          showDropIn={true}
          showEmbeddedComponents={true}
          showDropBasedComponents={true}
          showInstant={true}
        />
      </AdyenCheckout>
    </View>
  );
};

export default AdvancedCheckout;
