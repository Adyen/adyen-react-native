// @ts-check

import React, { useEffect, useCallback, useState } from 'react';
import { SafeAreaView, Alert, View, Text, useColorScheme } from 'react-native';
import { AdyenCheckout, ErrorCode, ResultCode } from '@adyen/react-native';
import ApiClient from '../../Utilities/APIClient';
import { checkoutConfiguration, useAppContext } from '../../Utilities/AppContext';
import PaymentMethods from './PaymentMethodsView';
import Styles from '../../Utilities/Styles';
import TopView from './TopView';

const SessionsCheckout = ({ navigation }) => {
  const { configuration } = useAppContext();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    refreshSession(configuration).catch((e) => {
      console.error(e);
    });
  }, []);

  const refreshSession = async (configuration) => {
    const session = await ApiClient.requestSssion(configuration);
    setSession(session)
  };

  const didComplete = useCallback(
    async (
      result,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ 
      nativeComponent
    ) => {
      console.log('didComplete');
      processResult(result, nativeComponent);
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
      nativeComponent.hide(success);
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
      nativeComponent.hide(false);
      if (error.errorCode === ErrorCode.canceled) {
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
      {session ? (
        <AdyenCheckout
          config={ checkoutConfiguration(configuration) }
          session={session}
          onComplete={didComplete}
          onError={didFail}
        >
          <PaymentMethods />
        </AdyenCheckout>
      ) : (
        <NoSessionView />
      )}
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

const NoSessionView = () => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View>
      <Text
        style={[
          Styles.centeredText,
          isDarkMode ? Styles.textDark : Styles.textLight,
        ]}
      >
        No Session
      </Text>
    </View>
  );
};

export default SessionsCheckout;
