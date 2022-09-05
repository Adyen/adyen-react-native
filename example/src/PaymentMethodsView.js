import React from 'react';
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

  const { start, paymentMethods } = useAdyenCheckout();
  const isDarkMode = useColorScheme() === 'dark';
  const contentBackgroundStyle = {
    backgroundColor: isDarkMode ? Colors.black : Colors.white,
  };
  const platformSpecificPayment =
    Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';
  const platformSpecificType =
    Platform.OS === 'ios' ? 'applepay' : 'googlepay';
  const isAvailable = (type) => {
    if (!paymentMethods) { return false; }
    return paymentMethods.paymentMethods.find(x => x.type === type.toLowerCase()) != null
  };

  return (
    <View style={[styles.contentView, contentBackgroundStyle]}>
      <Button
        title="Open DropIn"
        disabled={paymentMethods === null}
        onPress={() => {
          start('dropin');
        }}
      />
      <Button
        title="Open Card Component"
        disabled={paymentMethods === null}
        onPress={() => {
          start('scheme');
        }}
      />
      <Button
        title="Open iDeal"
        disabled={paymentMethods === null || !isAvailable('ideal')}
        onPress={() => {
          start('ideal');
        }}
      />
      <Button
        title="Open SEPA"
        disabled={paymentMethods === null || !isAvailable('sepaDirectDebit') }
        onPress={() => {
          start('sepaDirectDebit');
        }}
      />
      <Button
        title="Open Klarna"
        disabled={paymentMethods === null || !isAvailable('klarna')}
        onPress={() => {
          start('klarna');
        }}
      />
      <Button
        title="Open Qiwi Wallet"
        disabled={paymentMethods === null || !isAvailable('qiwiwallet') }
        onPress={() => {
          start('qiwiwallet');
        }}
      />
      <Button
        title={'Open ' + platformSpecificPayment + ' (WIP)'}
        disabled={paymentMethods === null || !isAvailable(platformSpecificType)}
        onPress={() => {
          start(platformSpecificType);
        }}
      />
    </View>
  );
};

export default PaymentMethods;
