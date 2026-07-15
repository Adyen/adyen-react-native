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
  Order,
  DropInModule,
  Balance,
  PartialPaymentComponent,
} from '@adyen/react-native';
import { CheckoutNavigator } from '../../router/CheckoutNavigator';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import { processAdyenError } from './utils/processAdyenError';
import { processError } from './utils/processError';
import { processPartialPaymentResult } from './utils/processPartialPaymentResult';

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
  }, [configuration, apiClient, setPaymentMethods, setLoading]);

  const didSubmit = useCallback(
    async (
      data: PaymentMethodData,
      nativeComponent: AdyenActionComponent,
      _extra: any
    ) => {
      try {
        const result = await apiClient.payments(
          data,
          configuration,
          data.returnUrl
        );
        const outcome = await processPartialPaymentResult(
          result,
          nativeComponent as DropInModule,
          configuration,
          apiClient
        );
        if (outcome) {
          processResult(outcome, nativeComponent);
        }
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [configuration, apiClient, processResult]
  );

  const didProvide = useCallback(
    async (data: PaymentDetailsData, nativeComponent: AdyenActionComponent) => {
      try {
        const result = await apiClient.paymentDetails(data);
        const outcome = await processPartialPaymentResult(
          result,
          nativeComponent as DropInModule,
          configuration,
          apiClient
        );
        if (outcome) {
          processResult(outcome, nativeComponent);
        }
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [configuration, apiClient, processResult]
  );

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenComponent) => {
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
          const newPaymentMethods = await apiClient.paymentMethods(
            configuration,
            order
          );
          const dropIn = component as unknown as DropInModule;
          dropIn.providePaymentMethods(newPaymentMethods, undefined);
        } else {
          component.hide(false);
        }
      } catch (e) {
        console.error("Order wasn't canceled! ", e);
      }
    },
    [configuration, apiClient]
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
        config={{
          ...checkoutConfiguration(configuration, apiClient),
          partialPayment: {
            onBalanceCheck: checkBalance,
            onOrderRequest: requestOrder,
            onOrderCancel: cancelOrder,
          },
        }}
        paymentMethods={paymentMethods}
        onSubmit={didSubmit}
        onAdditionalDetails={didProvide}
        onError={didFail}
      >
        <CheckoutNavigator showDropIn={true} />
      </AdyenCheckout>
    </View>
  );
};

export default PartialPaymentCheckout;
