// @ts-check

import React, { useCallback } from 'react';
import { useAdyenCheckout } from '../../../../lib/module';
import { Button, View, Platform } from 'react-native';
import Styles from '../../Utilities/Styles';

const PaymentMethods = () => {
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();

  const platformSpecificPayment =
    Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay';
  const platformSpecificType = Platform.OS === 'ios' ? 'applepay' : 'googlepay'; // In some cases 'paywithgoogle' can be in use. Check paymentMethods response first.

  const isAvailable = useCallback(
    (/** @type {string} */ type) => {
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

  const isNotReady = paymentMethodsResponse === null;

  return (
    <View style={[Styles.content]}>
      <Button
        title="Open DropIn"
        disabled={isNotReady}
        onPress={() => {
          start('dropin');
        }}
      />
      <Button
        title="Open Card Component"
        disabled={isNotReady}
        onPress={() => {
          start('scheme');
        }}
      />
      <Button
        title="Open iDeal"
        disabled={isNotReady || !isAvailable('ideal')}
        onPress={() => {
          start('ideal');
        }}
      />
      <Button
        title="Open SEPA"
        disabled={isNotReady || !isAvailable('sepaDirectDebit')}
        onPress={() => {
          start('sepaDirectDebit');
        }}
      />
      <Button
        title="Open Klarna"
        disabled={isNotReady || !isAvailable('klarna')}
        onPress={() => {
          start('klarna');
        }}
      />
      <Button
        title="Open Qiwi Wallet"
        disabled={isNotReady || !isAvailable('qiwiwallet')}
        onPress={() => {
          start('qiwiwallet');
        }}
      />
      <Button
        title={'Open ' + platformSpecificPayment}
        disabled={isNotReady || !isAvailable(platformSpecificType)}
        onPress={() => {
          start(platformSpecificType);
        }}
      />
    </View>
  );
};

export default PaymentMethods;
