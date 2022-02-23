import React from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import {
  Button,
  StyleSheet,
  useColorScheme,
  View,
  Platform } from 'react-native';

const styles = StyleSheet.create({
  contentView: {
    flex: 1,
    borderRadius: 5,
    justifyContent: "center",
  },
});

const PaymentMethods = () => {
  const { start, paymentMethods } = useAdyenCheckout();
  const isDarkMode = useColorScheme() === 'dark';
  const contentBackgroundStyle = { backgroundColor: isDarkMode ? Colors.black : Colors.white };
  const platformSpecificPayment = Platform.OS === 'ios' ? "Apple Pay" : "Google Pay"

  return (
    <View style={[styles.contentView, contentBackgroundStyle]}>
      <Button
        title="Open DropIn"
        disabled={paymentMethods === null}
        onPress={() => start('AdyenDropIn')}
      />
      <Button
        title="Open Card Component"
        disabled={paymentMethods === null}
        onPress={() => start('AdyenCardComponent')}
      />
      <Button
        title="Open iDEAL (WIP)"
        disabled
      />
      <Button
        title={'Open ' + platformSpecificPayment + ' (WIP)'}
        disabled
      />
    </View>
  );
};

export default PaymentMethods;
