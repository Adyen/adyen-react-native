// @ts-check

import React, { useEffect, useCallback, useState } from 'react';
import { SafeAreaView, Alert, ActivityIndicator, Platform } from 'react-native';
import { AdyenCheckout, AdyenDropIn, ErrorCode } from '@adyen/react-native';
import ApiClient from '../../Utilities/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../Utilities/checkoutConfiguration';
import PaymentMethods from './components/PaymentMethodsView';
import Styles from '../../Utilities/Styles';
import TopView from './components/TopView';
import { ENVIRONMENT } from '../../Configuration';
import { isSuccess } from '../../Utilities/Helpers';

const SessionsCheckout = ({ navigation }) => {
  const { configuration } = useAppContext();
  const [session, setSession] = useState();

  useEffect(() => {
    refreshSession(configuration).catch((e) => {
      console.error(e);
    });
  }, []);

  const refreshSession = async (configuration) => {
    const returnUrl = Platform.select({
      ios: ENVIRONMENT.returnUrl,
      android: await AdyenDropIn.getReturnURL(),
    });
    const session = await ApiClient.requestSession(configuration, returnUrl);
    setSession(session);
  };

  const onCompleteHandler = useCallback(
    async (
      result,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */
      nativeComponent
    ) => {
      console.log(`didComplete : ${JSON.stringify(result, null, ' ')}`);
      processResult(result, nativeComponent);
    },
    []
  );

  const onErrorHandler = useCallback(
    async (
      /** @type {import('@adyen/react-native').AdyenError} */
      error,
      /** @type {import('@adyen/react-native').AdyenComponent} */
      nativeComponent
    ) => {
      console.log(`didFailed: ${error.message}`);
      processError(error, nativeComponent);
    },
    []
  );

  const processResult = useCallback(
    async (
      /** @type {import('./../../Types/index').PaymentResponse} */
      result,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */
      nativeComponent
    ) => {
      const success = isSuccess(result);
      console.log(
        `Payment: ${success ? 'success' : 'failure'} : ${
          success ? result.resultCode : JSON.stringify(result, null, ' ')
        }`
      );
      nativeComponent.hide(success);
      navigation.popToTop();
      navigation.push('Result', {
        resultCode: result.resultCode,
      });
    },
    []
  );

  const processError = useCallback(
    async (
      /** @type {import('@adyen/react-native').AdyenError} */
      error,
      /** @type {import('@adyen/react-native').AdyenComponent} */
      nativeComponent
    ) => {
      nativeComponent.hide(false);
      if (error.errorCode === ErrorCode.canceled) {
        Alert.alert('Canceled');
        refreshSession(configuration);
      } else {
        Alert.alert('Error', error.message);
      }
    },
    [configuration]
  );

  return (
    <SafeAreaView style={Styles.page}>
      <TopView />
      {session ? (
        <AdyenCheckout
          config={checkoutConfiguration(configuration)}
          session={{id: session.id, sessionData: session.data }}
          onComplete={onCompleteHandler}
          onError={onErrorHandler}
        >
          <PaymentMethods showComponents={false} />
        </AdyenCheckout>
      ) : (
        <ActivityIndicator size="large" style={Styles.page} />
      )}
    </SafeAreaView>
  );
};

export default SessionsCheckout;
