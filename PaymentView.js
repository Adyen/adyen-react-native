import React from 'react';

import { AdyenDropInProvider, AdyenCheckoutContext } from './AdyenDropInProvider';
import { channel } from './Configuration';

import {
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
      if (context.paymentMethods) {
        console.log('Using local payment methods');
        openDropInComponent.apply(this, [context.paymentMethods, context.config]);
      } else {
        console.log('No payment methods!');
      }
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

            <View
              style={[
                styles.contentView,
                contentBackgroundStyle
              ]}>
            
            <AdyenDropInProvider>
            { adyenCheckout => ( 
              <Button
                title="Open DropIn"
                onPress={ () => { adyenCheckout.openDropInComponent(context.paymentMethods, context.config) } } />
              )}
            </AdyenDropInProvider>

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
          </SafeAreaView>
        )}
      </PaymentMethodsContext.Consumer>
    );
  };
  
  export default PaymentView;