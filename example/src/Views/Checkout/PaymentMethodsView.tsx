import React, { useCallback } from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import { Button, View, Platform, ScrollView } from 'react-native';
import Styles from '../../Utilities/Styles';

const PaymentMethods = () => {
  const { start, paymentMethods } = useAdyenCheckout();

  const isAvailable = useCallback(
    (type: string) => {
      if (!paymentMethods) {
        return false;
      }
      return (
        paymentMethods &&
        paymentMethods.paymentMethods.some(
          pm => pm.type.toLowerCase() === type.toLowerCase(),
        )
      );
    },
    [paymentMethods],
  );

  const isNotReady = paymentMethods === undefined;

  return (
    <ScrollView>
      <View style={Styles.content}>
        <View style={Styles.item}>
          <Button
            title="dropin"
            disabled={isNotReady}
            onPress={() => {
              start('dropin');
            }}
          />
        </View>

        {paymentMethods?.paymentMethods.map(p => {
          return (
            <View key={`${p.type}`} style={Styles.item}>
              <Button
                title={`${p.type}`}
                disabled={
                  isNotReady ||
                  !isAvailable(p.type) ||
                  (Platform.OS !== 'ios' && p.type === 'applepay') ||
                  (Platform.OS !== 'android' && ( p.type === 'googlepay' || p.type === 'paywithgoogle' ))
                  /// In some cases 'paywithgoogle' can be in use. Check paymentMethods response first.
                }
                onPress={() => {
                  start(p.type);
                }}
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default PaymentMethods;
