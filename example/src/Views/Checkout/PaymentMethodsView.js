import React, { useCallback } from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import { Button, View, Platform } from 'react-native';
import Styles from '../../Utilities/Styles';

const PaymentMethods = () => {
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();

  const platformSpecificPayment =
    Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';
  const platformSpecificType = Platform.OS === 'ios' ? 'applepay' : 'googlepay'; // In some cases 'paywithgoogle' can be in use. Check paymentMethods response first.

  const isAvailable = useCallback(
    (type) => {
      if (!paymentMethodsResponse) {
        return false;
      }
      const { paymentMethods } = paymentMethodsResponse;
      return (
        paymentMethods.length > 0 &&
        paymentMethods.some(
          (pm) => pm.type.toLowerCase() === type.toLowerCase()
        )
      );
    },
    [paymentMethodsResponse]
  );

  const isReady = paymentMethodsResponse === null;

  return (
    <View style={[Styles.content]}>
      <Button
        title="Open DropIn"
        disabled={isReady}
        onPress={() => {
          start('dropin');
        }}
      />
      <Button
        title="Open Card Component"
        disabled={isReady}
        onPress={() => {
          start('scheme');
        }}
      />
      <Button
        title="Open iDeal"
        disabled={isReady || !isAvailable('ideal')}
        onPress={() => {
          start('ideal');
        }}
      />
      <Button
        title="Open SEPA"
        disabled={isReady || !isAvailable('sepaDirectDebit')}
        onPress={() => {
          start('sepaDirectDebit');
        }}
      />
      <Button
        title="Open Klarna"
        disabled={isReady || !isAvailable('klarna')}
        onPress={() => {
          start('klarna');
        }}
      />
      <Button
        title="Open Qiwi Wallet"
        disabled={isReady || !isAvailable('qiwiwallet')}
        onPress={() => {
          start('qiwiwallet');
        }}
      />
      <Button
        title={'Open ' + platformSpecificPayment}
        disabled={isReady || !isAvailable(platformSpecificType)}
        onPress={() => {
          start(platformSpecificType);
        }}
      />
    </View>
  );
};

export default PaymentMethods;
