import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { AdyenCheckout, useAdyenCheckout } from '@adyen/react-native';
import type {
  AdvancedCallbacks,
  Configuration,
  PaymentResultHandler,
  PaymentSubmitResultHandler,
  PaymentAdditionalResultHandler,
  PaymentMethodsResponse,
  PaymentMethodData,
  PaymentDetailsData,
  AdyenError,
  Order,
  Balance,
  PartialPaymentComponent,
} from '@adyen/react-native';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import DropInButton from './components/DropInButton';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import { processAdyenError } from './utils/processAdyenError';
import { processError } from './utils/processError';

interface PartialPaymentContentProps {
  paymentMethods: PaymentMethodsResponse;
  callbacks: AdvancedCallbacks;
  configuration: Configuration;
}

const PartialPaymentContent = ({
  paymentMethods,
  callbacks,
  configuration,
}: PartialPaymentContentProps) => {
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

  return <DropInButton checkout={checkout} configuration={configuration} />;
};

const PartialPaymentCheckout = () => {
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
        // TODO: Partial-payment continuation (reloading Drop-in with refreshed
        // payment methods for a non-fully-paid order via providePaymentMethods)
        // is not available on the v6 handlers. Re-enable once the v6 DropIn
        // partial-payment continuation API lands. For now, handle the result
        // like a standard payment.
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
        // TODO: Partial-payment continuation is not available on the v6
        // handlers (see didSubmit). Handle the result like a standard payment
        // until the v6 DropIn partial-payment continuation API lands.
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

  const checkBalance = useCallback(
    async (
      paymentData: PaymentMethodData,
      resolve: (balance: Balance) => void,
      reject: (error: Error) => void
    ) => {
      try {
        const response = await apiClient.checkBalance(
          paymentData,
          configuration
        );
        resolve(response);
      } catch (e) {
        console.error('Balance check error: ', e);
        reject(e as Error);
      }
    },
    [configuration, apiClient]
  );

  const requestOrder = useCallback(
    async (resolve: (order: Order) => void, reject: (error: Error) => void) => {
      try {
        const response = await apiClient.requestOrder(configuration);
        resolve(response);
      } catch (e) {
        console.error('Order request error: ', e);
        reject(e as Error);
      }
    },
    [configuration, apiClient]
  );

  const cancelOrder = useCallback(
    async (
      order: Order,
      shouldUpdatePaymentMethods: Boolean,
      component: PartialPaymentComponent
    ) => {
      try {
        await apiClient.cancelOrder(order, configuration);
        if (shouldUpdatePaymentMethods) {
          // TODO: Reload Drop-in with refreshed payment methods via the v6
          // DropIn partial-payment continuation API (providePaymentMethods),
          // which the v6 handlers do not yet expose. Clearing the UI for now.
          console.warn(
            'Partial payment: reloading Drop-in after order cancel is not supported in v6 alpha yet.'
          );
        }
        component.completion('Cancelled');
      } catch (e) {
        console.error("Order wasn't canceled! ", e);
      }
    },
    [configuration, apiClient]
  );

  const callbacks = useMemo<AdvancedCallbacks>(
    () => ({
      onSubmit: didSubmit,
      onAdditionalDetails: didProvide,
      onError: didFail,
    }),
    [didSubmit, didProvide, didFail]
  );

  const config = useMemo<Configuration>(
    () => ({
      ...checkoutConfiguration(configuration),
      partialPayment: {
        onBalanceCheck: checkBalance,
        onOrderRequest: requestOrder,
        onOrderCancel: cancelOrder,
      },
    }),
    [configuration, checkBalance, requestOrder, cancelOrder]
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
        <PartialPaymentContent
          paymentMethods={paymentMethods}
          callbacks={callbacks}
          configuration={config}
        />
      </AdyenCheckout>
    </View>
  );
};

export default PartialPaymentCheckout;
