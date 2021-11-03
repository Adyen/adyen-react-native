import React from 'react';

import { fetchPaymentMethods } from './BackendClient' ;
import { openDropInComponent, CHANNEL } from './PaymentHandling';

import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View
} from 'react-native';

import { Colors } from 'react-native/Libraries/NewAppScreen';
import { globalConfiguration } from './Configuration';

const styles = StyleSheet.create({
    contentView: {
      flex: 1,
      borderRadius: 5,
      justifyContent: "center",
    }
});

var globalPaymentMethods = null;

export const onOpenDropInPress = (configuration) => {
  if (!globalPaymentMethods) {
    console.log('Requesting payment methods');
    fetchPaymentMethods(configuration)
    .then(paymentMethods => {
      globalPaymentMethods = paymentMethods;
      openDropInComponent(paymentMethods, configuration);
    })
    .catch(error => {
      console.log('Network error:', error);
    })
  } else {
    console.log('Using local payment methods');
    openDropInComponent(globalPaymentMethods, configuration);
  }
};

const PaymentView = ({ navigation }) => {

    const isDarkMode = useColorScheme() === 'dark';
  
    const backgroundStyle = { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter, };
    const contentBackgroundStyle = { backgroundColor: isDarkMode ? Colors.black : Colors.white };
  
    const platformSpecificPayment = CHANNEL == 'iOS' ? "Apple Pay" : "Google Pay"
    const platformSpecificButton = 'Open ' + platformSpecificPayment + ' (WIP)'
  
    return (
      <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />  
        
        <View
          style={[
            styles.contentView,
            contentBackgroundStyle
          ]}>
        
            <Button
              title="Open DropIn"
              onPress={ () => { onOpenDropInPress(globalConfiguration) } }
            />
            <Button
              title="Open Card Component (WIP)"
              disabled={true}
            />
            <Button
              title="Open iDEAL (WIP)"
              disabled={true}
            />
            <Button
              title={platformSpecificButton}
              disabled={true}
            />
            
        </View>
      </SafeAreaView>
    );
  };
  
  export default PaymentView;