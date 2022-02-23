import React from 'react';
import { AdyenPaymentProvider } from '@adyen/react-native';
import { fetchPayments, fetchPaymentDetails, isSuccess } from './APIClient';
import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  Text,
  View,
} from 'react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { PaymentMethodsContext } from './PaymentMethodsProvider';
import PaymentMethods from './PaymentMethods';

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

const PaymentView = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter, };

  const didSubmit = (data, nativeComponent) => {
    console.log('didSubmit');
    fetchPayments(data)
      .then((result) => {
        if (result.action) {
          console.log('Action!');
          nativeComponent.handle(result.action);
        } else {
          proccessResult(result, nativeComponent);
        }
      })
      .catch((error) => {
        console.log(error.message);
        nativeComponent.hide(false, {
          message: error.message || 'Unknown error',
        });
      });
  };

  const didProvide = (data, nativeComponent) => {
    console.log('didProvide');
    fetchPaymentDetails(data)
      .then((result) => {
        proccessResult(result, nativeComponent);
      })
      .catch((error) => {
        console.log(error);
        nativeComponent.hide(false, {
          message: error.message || 'Unknown error',
        });
      });
  };

  const didComplete = (nativeComponent) => {
    console.log('didComplete');
    nativeComponent.hide(true, { message: "Completed" });
  };

  const didFail = (error, nativeComponent) => {
    console.log('didFailed %s', error.message);
    nativeComponent.hide(false, { message: error.message || "Unknown error" });
  };

  const proccessResult = (result, nativeComponent) => {
    let success = isSuccess(result);
    console.log('Payment: %s : %s', (success ? 'success' : 'failure'), result.resultCode);
    nativeComponent.hide(success, { message: result.resultCode });
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
              Country: {context.paymentMethods == null ? '❗️' : getFlagEmoji(context.config.countryCode)}
            </Text>
            <Button
              title="Refresh Payment Methods"
              onPress={() => context.onConfigChanged(context.config)}
            />
          </View>

          <AdyenPaymentProvider
            config={context.config}
            paymentMethods={context.paymentMethods}
            onSubmit={didSubmit}
            onProvide={didProvide}
            onFail={didFail}
            onComplete={didComplete}
          >
            <PaymentMethods />
          </AdyenPaymentProvider>
        </SafeAreaView>
      )}
    </PaymentMethodsContext.Consumer>
  );
};

export default PaymentView;
