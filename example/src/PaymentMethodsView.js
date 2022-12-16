import React, { useCallback } from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import {
  Button,
  StyleSheet,
  useColorScheme,
  View,
  Platform,
} from 'react-native';

const styles = StyleSheet.create({
  contentView: {
    flex: 1,
    borderRadius: 5,
    justifyContent: 'center',
  },
});

const PaymentMethods = () => {

  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();
  const isDarkMode = useColorScheme() === 'dark';
  const contentBackgroundStyle = {
    backgroundColor: isDarkMode ? Colors.black : Colors.white,
  };
  const platformSpecificPayment =
    Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';
  const platformSpecificType =
    Platform.OS === 'ios' ? 'applepay' : 'googlepay'; // In some cases 'paywithgoogle' can be in use. Check paymentMethods response first.

  const isAvailable = useCallback(type => {
    const paymentMethods = paymentMethodsResponse.paymentMethods;
    return paymentMethods.length > 0 && paymentMethods.some(pm => pm.type.toLowerCase() === type.toLowerCase());
  }, [paymentMethodsResponse]);

  return (
    <View style={[styles.contentView, contentBackgroundStyle]}>
      <Button
        title="Open DropIn"
        disabled={paymentMethodsResponse === null}
        onPress={() => {
          start('dropin');
        }}
      />
      <Button
        title="Open Card Component"
        disabled={paymentMethodsResponse === null}
        onPress={() => {
          start('scheme');
        }}
      />
      <Button
        title="Open iDeal"
        disabled={paymentMethodsResponse === null || !isAvailable('ideal')}
        onPress={() => {
          start('ideal');
        }}
      />
      <Button
        title="Open SEPA"
        disabled={paymentMethodsResponse === null || !isAvailable('sepaDirectDebit') }
        onPress={() => {
          start('sepaDirectDebit');
        }}
      />
      <Button
        title="Open Klarna"
        disabled={paymentMethodsResponse === null || !isAvailable('klarna')}
        onPress={() => {
          start('klarna');
        }}
      />
      <Button
        title="Open Qiwi Wallet"
        disabled={paymentMethodsResponse === null || !isAvailable('qiwiwallet') }
        onPress={() => {
          start('qiwiwallet');
        }}
      />
      <Button
        title={'Open ' + platformSpecificPayment + ' (WIP)'}
        disabled={paymentMethodsResponse === null || !isAvailable(platformSpecificType)}
        onPress={() => {
          start(platformSpecificType);
        }}
      />
    </View>
  );
};

export default PaymentMethods;
