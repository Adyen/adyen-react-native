import { useEffect, useCallback, useMemo, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { AdyenCheckout } from '@adyen/react-native';
import type {
  Checkout,
  Configuration,
  PaymentResult,
  PaymentSubmitResultHandler,
  PaymentAdditionalResultHandler,
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

const PartialPaymentCheckout = () => {
  const { configuration, processResult, apiClient } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

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
        // TODO: Partial-payment continuation is not available on the v6
        // handlers (see didSubmit). Handle the result like a standard payment
        // until the v6 DropIn partial-payment continuation API lands.
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
      <DropInButton checkout={checkout} />
    </View>
  );
};

export default PartialPaymentCheckout;
