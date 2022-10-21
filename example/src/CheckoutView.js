import React from 'react';
import { AdyenCheckout } from '@adyen/react-native';
import { fetchPayments, fetchPaymentDetails, isSuccess } from './APIClient';
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  Text,
  View,
  Alert,
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { PaymentMethodsContext } from './PaymentMethodsProvider';
import PaymentMethods from './PaymentMethodsView';
import { ERROR_CODE_CANCELED } from '../../src';

const styles = StyleSheet.create({
  topContentView: {
    alignItems: 'center',
    borderRadius: 5,
    justifyContent: 'center',
    padding: 16,
  },
});

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const CheckoutView = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const didSubmit = (data, nativeComponent, configuration) => {
    console.log('didSubmit: %s', data.paymentMethod.type);
    fetchPayments(data, configuration)
      .then((result) => {
        if (result.action) {
          console.log('Action!');
          nativeComponent.handle(result.action);
        } else {
          proccessResult(result, nativeComponent);
        }
      })
      .catch((error) => proccessError(error, nativeComponent));
  };

  const didProvide = (data, nativeComponent) => {
    console.log('didProvide');
    fetchPaymentDetails(data)
      .then((result) => proccessResult(result, nativeComponent))
      .catch((error) => proccessError(error, nativeComponent));
  };

  const didComplete = (nativeComponent) => {
    console.log('didComplete');
    nativeComponent.hide(true, { message: 'Completed' });
  };

  const didFail = (error, nativeComponent) => {
    console.log('didFailed: %s', error.message);
    proccessError(error, nativeComponent)
  };

  const proccessResult = (result, nativeComponent) => {
    let success = isSuccess(result);
    console.log(
      'Payment: %s : %s',
      success ? 'success' : 'failure',
      result.resultCode
    );
    nativeComponent.hide(success, { message: result.resultCode });
    Alert.alert(result.resultCode);
  };

  const proccessError = (error, nativeComponent) => {
    nativeComponent.hide(false, { message: error.message || 'Unknown error' });
    if (error.errorCode == ERROR_CODE_CANCELED) {
      Alert.alert('Canceled');
    } else {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <PaymentMethodsContext.Consumer>
      {(context) => (
        <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

          <View style={[styles.topContentView]}>
            <Text>
              {context.config.amount.value} {context.config.amount.currency}
            </Text>
            <Text>
              Country:{' '}
              {context.paymentMethods == null
                ? '❗️'
                : getFlagEmoji(context.config.countryCode)}
            </Text>
            <Button
              title="Refresh Payment Methods"
              onPress={() => context.onConfigChanged(context.config)}
            />
          </View>

          <AdyenCheckout
            config={context.config}
            paymentMethods={context.paymentMethods}
            onSubmit={ (payload, nativeComponent) => { didSubmit(payload, nativeComponent, context.config) }}
            onProvide={didProvide}
            onFail={didFail}
            onComplete={didComplete}
          >
            <PaymentMethods />
          </AdyenCheckout>
        </SafeAreaView>
      )}
    </PaymentMethodsContext.Consumer>
  );
};

export default CheckoutView;
