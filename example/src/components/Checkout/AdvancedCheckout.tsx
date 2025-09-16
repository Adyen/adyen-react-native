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
import PaymentMethods from './components/PaymentMethodsView';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import ApiClient from '../../api/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../State/checkoutConfiguration';
import type { PageProps } from '../../State/RootStackParamList';
import { processResult } from './utils/processResult';
import { processAdyenError } from './utils/processAdyenError';
import { processError } from './utils/processError';

const AdvancedCheckout = ({ navigation }: PageProps) => {
  const { configuration } = useAppContext();
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
          processResult(result, nativeComponent, navigation);
        }
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [configuration, navigation]
  );

  const didProvide = useCallback(
    async (data: PaymentDetailsData, nativeComponent: AdyenActionComponent) => {
      try {
        const result = await ApiClient.paymentDetails(data);
        processResult(result, nativeComponent, navigation);
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [navigation]
  );

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenComponent) => {
      console.log(`didFailed: ${error.message}`);
      processAdyenError(error, nativeComponent);
    },
    []
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
    <View>
      <TopView />
      <AdyenCheckout
        config={checkoutConfiguration(configuration)}
        paymentMethods={paymentMethods}
        onSubmit={didSubmit}
        onAdditionalDetails={didProvide}
        onComplete={(result, component) => {
          // `onComplete` is only called for Voucher payment methods
          processResult(result, component, navigation);
        }}
        onError={didFail}
      >
        <PaymentMethods showComponents={true} navigation={navigation} />
      </AdyenCheckout>
    </View>
  );
};

export default AdvancedCheckout;
