import React from 'react';

import { AdyenPaymentProvider } from '@adyen/react-native';
import { channel } from './Configuration';
import { fetchPayments, fetchPaymentDetails } from './APIClient' ;

import { NativeModules } from 'react-native';
const { AdyenDropIn } = NativeModules;

import {
  Alert,
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  Text,
  View
} from 'react-native';

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

    const platformSpecificPayment = channel == 'iOS' ? "Apple Pay" : "Google Pay"
    const platformSpecificButton = 'Open ' + platformSpecificPayment + ' (WIP)'

    const onOpenDropInPress = (context) => {

    };

    const didSubmit = (data) => {
      console.log('didSubmit called: ', data.paymentMethod.type);

      fetchPayments(data)
      .then(result => {
        if (result.action) {
          console.log('- - Action!');
          AdyenDropIn.handle(result.action);
        } else {
          console.log('- - Not en action!');
          console.log(result);
          Alert.alert('Payment', result.resultCode);
        }
      })
      .catch(error => {
        console.log('Network error:', error);
      })
    };

    const didProvide = (data) => {
      console.log('didProvide called '), data;
      AdyenDropIn.hideDropIn();

      fetchPaymentDetails(data)
      .then(result => {
          Alert.alert('Payment', result.resultCode);
      })
      .catch(error => {
        console.log('Network error:', error);
      })
    };

    const didComplete = () => {
      console.log('didComplete called');
      AdyenDropIn.hideDropIn();
    };

    const didFail = (error) => {
      console.log('setDidFail called: ', error);
      Alert.alert('Error', error.message || "Unknown error");
      AdyenDropIn.hideDropIn();
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
                    onPress={ () => {
                      if (context.paymentMethods) {
                        adyenPayment.start(context.config);
                        AdyenDropIn.openDropIn(context.paymentMethods, context.config);
                      } else {
                        Alert.alert('Error', 'No payment methods!');
                      }
                    } } />

                  <Button
                    title="Open Card Component (WIP)"
                    disabled={true} />
                  <Button
                    title="Open iDEAL (WIP)"
                    disabled={true} />
                  <Button
                    title={platformSpecificButton}
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
