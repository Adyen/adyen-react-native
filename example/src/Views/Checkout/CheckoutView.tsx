import React, { useEffect, useCallback } from 'react';
import { SafeAreaView, Alert, ActivityIndicator, Button } from 'react-native';
import {
  AdyenActionComponent,
  AdyenCheckout,
  AdyenError,
  ErrorCode,
  PaymentMethodData,
  PaymentResponse,
  ResultCode,
} from '@adyen/react-native';
import ApiClient from '../../Utilities/APIClient';
import { usePaymentMethods } from '../../Utilities/PaymentMethodsProvider';
import PaymentMethods from './PaymentMethodsView';
import Styles from '../../Utilities/Styles';
import TopView from './TopView';
import { CheckoutScreenProps } from '../../@types/navigation';

const CheckoutView = ({ navigation }: CheckoutScreenProps) => {
  const { config, paymentMethods, refreshPaymentMethods } = usePaymentMethods();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button onPress={() => navigation.navigate('Settings')} title="Edit" />
      ),
    });
  }, []);

  useEffect(() => {
    refreshPaymentMethods();
  }, [refreshPaymentMethods]);

  const processResult = useCallback(
    async (result: PaymentResponse, nativeComponent: AdyenActionComponent) => {
      const success = isSuccess(result);
      console.log(
        `Payment: ${success ? 'success' : 'failure'} : ${
          success ? result.resultCode : JSON.stringify(result)
        }`,
      );
      nativeComponent.hide(success);
      navigation.popToTop();
      navigation.push('Result', { result: result.resultCode });
    },
    [navigation],
  );

  const processError = useCallback(
    async (error: AdyenError, nativeComponent: AdyenActionComponent) => {
      nativeComponent.hide(false);
      if (error.errorCode === ErrorCode.canceled) {
        Alert.alert('Canceled');
      } else {
        Alert.alert('Error', error.message);
      }
    },
    [],
  );

  const didSubmit = useCallback(
    async (data: PaymentMethodData, nativeComponent: AdyenActionComponent) => {
      console.log(`didSubmit: ${data.paymentMethod.type}`);
      try {
        const result = await ApiClient.payments(data, config);
        if (result.action) {
          nativeComponent.handle(result.action);
        } else {
          processResult(result, nativeComponent);
        }
      } catch (error: any) {
        processError(error, nativeComponent);
      }
    },
    [processError, processResult],
  );

  const didProvide = useCallback(
    async (data: PaymentMethodData, nativeComponent: AdyenActionComponent) => {
      console.log('didProvide');
      try {
        const result = await ApiClient.paymentDetails(data);
        processResult(result, nativeComponent);
      } catch (error: any) {
        processError(error, nativeComponent);
      }
    },
    [processError, processResult],
  );

  const didComplete = useCallback(
    async (nativeComponent: AdyenActionComponent) => {
      console.log('didComplete');
      nativeComponent.hide(true);
    },
    [],
  );

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenActionComponent) => {
      console.log(`didFailed: ${error.message}`);
      processError(error, nativeComponent);
    },
    [processError],
  );

  return (
    <SafeAreaView style={Styles.page}>
      <TopView />
      {!paymentMethods && <ActivityIndicator />}

      {paymentMethods && (
        <AdyenCheckout
          config={config}
          paymentMethods={paymentMethods}
          onSubmit={didSubmit}
          onAdditionalDetails={didProvide}
          onComplete={didComplete}
          onError={didFail}>
          <PaymentMethods />
        </AdyenCheckout>
      )}
    </SafeAreaView>
  );
};

const isSuccess = (result: PaymentResponse) => {
  const code = result.resultCode;
  return (
    code === ResultCode.authorised ||
    code === ResultCode.received ||
    code === ResultCode.pending
  );
};

export default CheckoutView;
