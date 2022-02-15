import React from 'react';

import { AdyenPaymentProvider } from '@adyen/react-native';
import { fetchPayments, fetchPaymentDetails } from './APIClient' ;

import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  Text,
  View,
  NativeModules,
  Platform } from 'react-native';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { PaymentMethodsContext } from './PaymentMethodsProvider';

const { AdyenDropIn, AdyenCardComponent } = NativeModules;

const styles = StyleSheet.create({
    contentView: {
      flex: 1,
      borderRadius: 5,
      justifyContent: "center",
    },
    topContentView: {
      alignItems: "center",
      borderRadius: 5,
      justifyContent: "center",
      padding: 16
    }
});

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char =>  127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const PaymentView = () => {

    const isDarkMode = useColorScheme() === 'dark';

    const backgroundStyle = { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter, };
    const contentBackgroundStyle = { backgroundColor: isDarkMode ? Colors.black : Colors.white };

    const platformSpecificPayment = Platform.OS === 'ios' ? "Apple Pay" : "Google Pay"

    var paymentComponent = {}

    const didSubmit = (data) => {
      console.log("Submit!");
      fetchPayments(data)
      .then(result => {
        if (result.action) {
          console.log("Action!");
          paymentComponent.handle(result.action);
        } else {
          let success = result.resultCode === "Authorized";
          console.log("Payment: " + result.resultCode);
          paymentComponent.hide(success, { "message": result.resultCode });
        }
      })
      .catch(error => {
        console.log(error.message);
        paymentComponent.hide(false, { "message": error.message || "Unknown error" });
      })
    };

    const didProvide = (data) => {
      console.log('didProvide ' + data);
      fetchPaymentDetails(data)
      .then(result => {
          let success = result.resultCode === "Authorized";
          paymentComponent.hide(success, { "message": result.resultCode });
      })
      .catch(error => {
        console.log(error);
        paymentComponent.hide(false, { "message": error.message || "Unknown error" });
      })
    };

    const didComplete = () => {
      paymentComponent.hide(true, { "message": "Completed" });
    };

    const didFail = (error) => {
      console.log('didFailed ' + error.message);
      paymentComponent.hide(false, { "message": error.message || "Unknown error" });
    };

    const payWith = (nativeComponent, adyenPayment, paymentMethods, config) => {
      console.log('Paying ' + nativeComponent );
      paymentComponent = nativeComponent;
      nativeComponent.open(paymentMethods, config);
      adyenPayment.start(nativeComponent, config);
    };

    return (
      <PaymentMethodsContext.Consumer>
        { context => (
          <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <View style={[ styles.topContentView ]}>
              <Text> {context.config.amount.value} {context.config.amount.currency}</Text>
              <Text> Country: {context.paymentMethods == null ? "❗️" : getFlagEmoji(context.config.countryCode)} </Text>
            </View>

            <AdyenPaymentProvider
              didSubmit={didSubmit}
              didProvide={didProvide}
              didFail={didFail}
              didComplete={didComplete} >
                { adyenPayment => (
                  <View style={[ styles.contentView, contentBackgroundStyle ]}>
                    <Button
                      title="Open DropIn"
                      disabled={context.paymentMethods == null}
                      onPress={ () => { payWith(AdyenDropIn, adyenPayment, context.paymentMethods, context.config) } } />
                    <Button
                      title="Open Card Component"
                      disabled={context.paymentMethods == null}
                      onPress={ () => { payWith(AdyenCardComponent, adyenPayment, context.paymentMethods, context.config) } } />
                    <Button
                      title="Open iDEAL (WIP)"
                      disabled={true} />
                    <Button
                      title={ 'Open ' + platformSpecificPayment + ' (WIP)' }
                      disabled={true} />
                  </View>
              )}
            </AdyenPaymentProvider>

          </SafeAreaView>
        )}
      </PaymentMethodsContext.Consumer>
    );
  };

  export default PaymentView;
