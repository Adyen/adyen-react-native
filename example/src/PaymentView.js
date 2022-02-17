import React from 'react';

// import { AdyenPaymentProvider } from './AdyenCheckoutContext';
import { AdyenPaymentProvider, getNativeComponent } from '@adyen/react-native';
import { fetchPayments, fetchPaymentDetails, isSuccess } from './APIClient' ;

import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  Text,
  View,
  Platform } from 'react-native';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { PaymentMethodsContext } from './PaymentMethodsProvider';

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

    const [currentComponent, setPaymentComponent] = React.useState('');

    const didSubmit = (data) => {
      console.log('didSubmit');
      const nativeComponent = getNativeComponent(currentComponent);
      fetchPayments(data)
      .then(result => {
        if (result.action) {
          console.log("Action!");
          nativeComponent.handle(result.action);
        } else {
          let success = isSuccess(result);
          console.log('Payment: ' + (success ? 'success' : 'failure') + ' : ' + result.resultCode);
          nativeComponent.hide(success, { message: result.resultCode });
        }
      })
      .catch(error => {
        console.log(error.message);
        nativeComponent.hide(false, { message: error.message || "Unknown error" });
      })
    };

    const didProvide = (data) => {
      console.log('didProvide');
      const nativeComponent = getNativeComponent(currentComponent);
      fetchPaymentDetails(data)
      .then(result => {
          let success = isSuccess(result);
          console.log('Payment: ' + (success ? 'success' : 'failure') + ' : ' + result.resultCode);
          nativeComponent.hide(success, { message: result.resultCode });
      })
      .catch(error => {
        console.log(error);
        nativeComponent.hide(false, { message: error.message || "Unknown error" });
      })
    };

    const didComplete = () => {
      console.log('didComplete');
      const nativeComponent = getNativeComponent(currentComponent);
      nativeComponent.hide(true, { message: "Completed" });
    };

    const didFail = (error) => {
      console.log('didFailed ' + error.message);
      const nativeComponent = getNativeComponent(currentComponent);
      nativeComponent.hide(false, { message: error.message || "Unknown error" });
    };

    const payWith = (nativeComponentName, adyenPayment, paymentMethods, config) => {
      const nativeComponent = getNativeComponent(nativeComponentName);
      setPaymentComponent(nativeComponentName);
      console.log('Paying with ' + nativeComponent );
      adyenPayment.start(nativeComponent, config);

      getNativeComponent(nativeComponentName).open(paymentMethods, config);
    };

    return (
      <PaymentMethodsContext.Consumer>
        { context => (
          <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            <View style={[ styles.topContentView ]}>
              <Text> {context.config.amount.value} {context.config.amount.currency}</Text>
              <Text> Country: {context.paymentMethods == null ? "❗️" : getFlagEmoji(context.config.countryCode)} </Text>
              <Button
                title="Refresh Payment Methods"
                onPress= { () => context.onConfigChanged(context.config) } />
            </View>

            <AdyenPaymentProvider
              didSubmit={ didSubmit }
              didProvide={ didProvide }
              didFail={ didFail }
              didComplete={ didComplete }>
                { adyenPayment => (
                  <View style={[ styles.contentView, contentBackgroundStyle ]}>
                    <Button
                      title="Open DropIn"
                      disabled={context.paymentMethods == null}
                      onPress={ () => { payWith('AdyenDropIn', adyenPayment, context.paymentMethods, context.config) } } />
                    <Button
                      title="Open Card Component"
                      disabled={context.paymentMethods == null}
                      onPress={ () => { payWith('AdyenCardComponent', adyenPayment, context.paymentMethods, context.config) } } />
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
