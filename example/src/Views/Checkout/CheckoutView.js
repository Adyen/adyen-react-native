// @ts-check

import React, { useEffect, useCallback } from 'react';
import { SafeAreaView, Alert, View, Text, useColorScheme } from 'react-native';
import { AdyenCheckout, ErrorCode, ResultCode } from '@adyen/react-native';
import ApiClient from '../../Utilities/APIClient';
import { useAppContext } from '../../Utilities/AppContext';
import PaymentMethods from './PaymentMethodsView';
import Styles from '../../Utilities/Styles';
import TopView from './TopView';
import { ENVIRONMENT } from '../../Configuration';

const CheckoutView = ({ navigation }) => {
  const { configuration, paymentMethods, refreshPaymentMethods } =
    useAppContext();

  useEffect(() => {
    refreshPaymentMethods(configuration).catch((e) => {
      console.error(e);
    });
  }, []);

  const didSubmit = useCallback(
    async (
      /** @type {import('@adyen/react-native').PaymentMethodData} */ data,
      /** @type {import('@adyen/react-native').AdyenActionComponent} */ nativeComponent,
      /** @type any */ extra
    ) => {
      console.log(`didSubmit: ${data.paymentMethod.type} with extra: ${JSON.stringify(extra, null, " ")}`);
      try {
        /** @type {import('@adyen/react-native').PaymentResponse} */
        const result = await ApiClient.payments(data, configuration);
        if (result.action) {
          nativeComponent.handle(result.action);
        } else {
          processResult(result, nativeComponent);
        }
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
      nativeComponent.hide(true);
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
      {paymentMethods ? (
        <AdyenCheckout
          config={
            /** @type {import('@adyen/react-native').Configuration} */
            {
              clientKey: ENVIRONMENT.clientKey,
              environment: ENVIRONMENT.environment,
              returnUrl: ENVIRONMENT.returnUrl,
              amount: {
                value: configuration.amount,
                currency: configuration.currency,
              },
              countryCode: configuration.countryCode,
              applepay: {
                merchantID: ENVIRONMENT.applepayMerchantID,
                merchantName: configuration.merchantName,
                billingContact: {
                  phoneNumber: '+1 41231232',
                  emailAddress: 'emailAddress@test.com',
                  givenName: 'name',
                  familyName: 'familyName',
                  addressLines: ['addressLines1'],
                  locality: 'locality',
                  subLocality: 'subLocality',
                  subAdministrativeArea: 'subAdministrativeArea',
                  postalCode: '123143',
                  administrativeArea: 'administrativeArea',
                  country: 'country',
                  countryCode: 'countryCode',
                  phoneticGivenName: 'phoneticName',
                  phoneticFamilyName: 'phoneticFamilyName'
                },
                requiredBillingContactFields: [ 'phoneticName', 'postalAddress', 'phone', 'email' ],
                requiredShippingContactFields: [ 'name', 'phone', 'email' ]
              },
            }
          }
          paymentMethods={paymentMethods}
          onSubmit={didSubmit}
          onAdditionalDetails={didProvide}
          onComplete={didComplete}
          onError={didFail}
        >
          <PaymentMethods />
        </AdyenCheckout>
      ) : (
        <NoPaymentMethodsView />
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

const NoPaymentMethodsView = () => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View>
      <Text
        style={[
          Styles.centeredText,
          isDarkMode ? Styles.textDark : Styles.textLight,
        ]}
      >
        No Payment methods
      </Text>
    </View>
  );
};

export default CheckoutView;
