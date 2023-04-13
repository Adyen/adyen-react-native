import React, { useCallback } from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import { Button, View, Platform } from 'react-native';
import Styles from '../../Utilities/Styles';

const PaymentMethods = () => {
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();

  const isAvailable = useCallback(
    (type: string) => {
      if (!paymentMethodsResponse) {
        return false;
      }
      const { paymentMethods } = paymentMethodsResponse;
      return (
        paymentMethods.length > 0 &&
        paymentMethods.some(pm => pm.type.toLowerCase() === type.toLowerCase())
      );
    },
    [paymentMethodsResponse],
  );

  const isNotReady = paymentMethodsResponse === undefined;

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
      {Platform.OS !== 'android' && (
        <Button
          title={'Open Apple Pay'}
          disabled={isNotReady || !isAvailable('applepay')}
          onPress={() => {
            start('applepay');
          }}
        />
      )}
      {/* In some cases 'paywithgoogle' can be in use. Check paymentMethods response first. */}
      {Platform.OS !== 'android' && (
        <Button
          title={'Open Google Pay'}
          disabled={isNotReady || !isAvailable('googlepay')}
          onPress={() => {
            start('googlepay');
          }}
        />
      )}
    </View>
  );
};

export default PaymentMethods;
