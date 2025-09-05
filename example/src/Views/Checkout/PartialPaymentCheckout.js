// @ts-check

import React, { useEffect, useCallback, useState } from 'react';
import { SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { AdyenCheckout, ErrorCode } from '@adyen/react-native';
import PaymentMethods from './PaymentMethodsView';
import Styles from '../../Utilities/Styles';
import TopView from './TopView';
import ApiClient from '../../api/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { isSuccess } from '../../Utilities/isSuccess';

const PartialPaymentCheckout = ({ navigation }) => {
  const { configuration } = useAppContext();
  const [paymentMethods, setPaymentMethods] = useState(undefined);

  useEffect(() => {
    ApiClient.paymentMethods(configuration, undefined)
      .then(setPaymentMethods)
      .catch((e) => {
        console.error(e);
      });
  }, []);

  const didSubmit = useCallback(
    async (
      /** @type {import('@adyen/react-native').PaymentMethodData} */ data,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent,
      /** @type any */ extra
    ) => {
      console.debug(
        `didSubmit: ${data.paymentMethod.type} with extra: ${JSON.stringify(
          extra,
          null,
          ' '
        )}`
      );
      try {
        /** @type {import('../../api/types').PaymentResponse} */
        const result = await ApiClient.payments(
          data,
          configuration,
          data.returnUrl
        );
        processResult(result, nativeComponent);
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [configuration]
  );

  const didProvide = useCallback(
    async (
      /** @type {any} */ data,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      console.debug('didProvide');
      try {
        const result = await ApiClient.paymentDetails(data);
        processResult(result, nativeComponent);
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    []
  );

  const didComplete = useCallback(
    async (
      result,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      console.log('didComplete');
      processResult(result, nativeComponent);
    },
    []
  );

  const didFail = useCallback(
    async (
      /** @type {import('@adyen/react-native').AdyenError} */ error,
      /** @type {import('@adyen/react-native').AdyenComponent} */ nativeComponent
    ) => {
      console.log(`didFailed: ${error.message}`);
      processError(error, nativeComponent);
    },
    []
  );

  const processResult = useCallback(
    async (
      /** @type {import('../../api/types').PaymentResponse} */
      result,
      /** @type {import('@adyen/react-native').DropInModule} */
      dropInComponent
    ) => {
      var success = isSuccess(result);
      var outcome = result.resultCode.toString();
      if (result.action) {
        dropInComponent.handle(result.action);
        return;
      } else if (isRefusedInPartialPaymentFlow(result)) {
        success = false;
        outcome = 'Refused';
      } else if (isNonFullyPaidOrder(result)) {
        try {
          let order = {
            orderData: result?.order?.orderData,
            pspReference: result?.order?.pspReference,
          };
          let paymentMethods = await ApiClient.paymentMethods(
            configuration,
            order
          );
          dropInComponent.providePaymentMethods(paymentMethods, order);
          return;
        } catch (error) {
          success = false;
          outcome = error.message;
        }
      }
      console.log(`Payment ${success ? 'success' : 'failure'} : ${outcome}`);
      dropInComponent.hide(success);
      navigation.popToTop();
      navigation.push('Result', { result: outcome });
    },
    []
  );

  const processError = useCallback(
    async (
      /** @type {import('@adyen/react-native').AdyenError} */ error,
      /** @type {import('@adyen/react-native').AdyenComponent} */ nativeComponent
    ) => {
      nativeComponent.hide(false);
      if (error.errorCode === ErrorCode.canceled) {
        Alert.alert('Canceled');
      } else {
        Alert.alert('Error', error.message);
      }
    },
    []
  );

  const checkBalance = useCallback(
    async (paymentData, resolve, reject) => {
      try {
        let response = await ApiClient.checkBalance(paymentData, configuration);
        resolve({
          balance: response.balance,
          transactionLimit: response.transactionLimit,
        });
      } catch (e) {
        console.error('Balance check error: ' + JSON.stringify(e));
        reject(e);
      }
    },
    [configuration]
  );

  const requestOrder = useCallback(
    async (resolve, reject) => {
      try {
        let response = await ApiClient.requestOrder(configuration);
        resolve(response);
      } catch (e) {
        console.error('Order request error: ' + JSON.stringify(e));
        reject(e);
      }
    },
    [configuration]
  );

  const cancelOrder = useCallback(
    async (
      /** @type {import('@adyen/react-native').Order} */ order,
      /** @type {Boolean} */ shouldUpdatePaymentMethods,
      /** @type {import('@adyen/react-native').DropInModule} */ dropInComponent
    ) => {
      try {
        await ApiClient.cancelOrder(order, configuration);
        if (shouldUpdatePaymentMethods) {
          let paymentMethods = await ApiClient.paymentMethods(
            configuration,
            order
          );
          dropInComponent.providePaymentMethods(paymentMethods, undefined);
        } else {
          dropInComponent.hide(false);
        }
      } catch (e) {
        console.error("Order wasn't canceled! " + JSON.stringify(e, null, ' '));
      }
    },
    [configuration]
  );

  /**
   * @param {import('../../api/types').PaymentResponse} response
   */
  function isRefusedInPartialPaymentFlow(response) {
    return isRefused(response) && isNonFullyPaidOrder(response);
  }

  /**
   * @param {import('../../api/types').PaymentResponse} response
   */
  function isRefused(response) {
    return response?.resultCode === 'Refused';
  }

  /**
   * @param {import('../../api/types').PaymentResponse} response
   */
  function isNonFullyPaidOrder(response) {
    const remainingAmount = response?.order?.remainingAmount?.value ?? 0;
    return remainingAmount > 0;
  }

  return (
    <SafeAreaView style={Styles.page}>
      <TopView />
      {paymentMethods ? (
        <AdyenCheckout
          config={{
            ...checkoutConfiguration(configuration),
            partialPayment: {
              onBalanceCheck: checkBalance,
              onOrderRequest: requestOrder,
              onOrderCancel: cancelOrder,
            },
          }}
          paymentMethods={paymentMethods}
          onSubmit={didSubmit}
          onAdditionalDetails={didProvide}
          onComplete={didComplete}
          onError={didFail}
        >
          <PaymentMethods showComponents={false} />
        </AdyenCheckout>
      ) : (
        <ActivityIndicator size="large" style={Styles.page} />
      )}
    </SafeAreaView>
  );
};

export default PartialPaymentCheckout;
