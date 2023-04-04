// @ts-check

import React, { useEffect, useCallback } from 'react';
import { SafeAreaView, Alert } from 'react-native';
import { AdyenCheckout, ErrorCode, ResultCode } from '@adyen/react-native';
import ApiClient from '../../Utilities/APIClient';
import { usePaymentMethods } from '../../Utilities/PaymentMethodsProvider';
import PaymentMethods from './PaymentMethodsView';
import Styles from '../../Utilities/Styles';
import TopView from './TopView';

const CheckoutView = ({ navigation }) => {
  const { config, paymentMethods, refreshPaymentMethods } = usePaymentMethods();

  useEffect(() => {
    refreshPaymentMethods();
  }, []);

  const didSubmit = useCallback(
    async (
      /** @type {import('@adyen/react-native').PaymentMethodData} */ data,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      console.log(`didSubmit: ${data.paymentMethod.type}`);
      try {
        /** @type {import('@adyen/react-native').PaymentResponse} */
        const result = await ApiClient.payments(data, config);
        if (result.action) {
          nativeComponent.handle(result.action);
        } else {
          processResult(result, nativeComponent);
        }
      } catch (error) {
        processError(error, nativeComponent);
      }
    },
    [config]
  );

  const didProvide = useCallback(
    async (
      /** @type {any} */ data,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      console.log('didProvide');
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
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      console.log('didComplete');
      nativeComponent.hide(true, { message: 'Completed' });
    },
    []
  );

  const didFail = useCallback(
    async (
      /** @type {import('@adyen/react-native').AdyenError} */ error,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      console.log(`didFailed: ${error.message}`);
      processError(error, nativeComponent);
    },
    []
  );

  const processResult = useCallback(
    async (
      /** @type {import('@adyen/react-native').PaymentResponse} */ result,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      const success = isSuccess(result);
      console.log(
        `Payment: ${success ? 'success' : 'failure'} : ${
          success ? result.resultCode : JSON.stringify(result)
        }`
      );
      nativeComponent.hide(success, { message: result.resultCode });
      navigation.popToTop();
      navigation.push('Result', { result: result.resultCode });
    },
    []
  );

  const processError = useCallback(
    async (
      /** @type {import('@adyen/react-native').AdyenError} */ error,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent
    ) => {
      nativeComponent.hide(false, {
        message: error.message || 'Unknown error',
      });
      if (error.errorCode == ErrorCode.canceled) {
        Alert.alert('Canceled');
      } else {
        Alert.alert('Error', error.message);
      }
    },
    []
  );

  return (
    <SafeAreaView style={Styles.page}>
      <TopView />
      <AdyenCheckout
        config={{
          clientKey: config.clientKey,
          environment: 'test',
          returnUrl: config.returnUrl,
          amount: { value: 1000, currency: 'EUR' },
          countryCode: 'NL',
        }}
        paymentMethods={paymentMethods}
        onSubmit={didSubmit}
        onAdditionalDetails={didProvide}
        onComplete={didComplete}
        onError={didFail}
      >
        <PaymentMethods />
      </AdyenCheckout>
    </SafeAreaView>
  );
};

const isSuccess = (
  /** @type {import('@adyen/react-native').PaymentResponse} */ result
) => {
  const code = result.resultCode;
  return (
    code === ResultCode.authorised ||
    code === ResultCode.received ||
    code === ResultCode.pending
  );
};

export default CheckoutView;
