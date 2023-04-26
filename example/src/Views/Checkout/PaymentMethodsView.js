// @ts-check

import React, { useCallback } from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import { Button, View, Platform, ScrollView } from 'react-native';
import Styles from '../../Utilities/Styles';

const PaymentMethods = () => {
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();

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

  const isNotReady = paymentMethodsResponse === undefined;

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

        {paymentMethodsResponse?.paymentMethods.map((p) => {
          return (
            <View key={`${p.type}`} style={Styles.item}>
              <Button
                title={`${p.type}`}
                disabled={
                  !isAvailable(p.type) ||
                  (Platform.OS !== 'ios' && p.type === 'applepay') ||
                  /// In some cases 'paywithgoogle' can be in use. Check paymentMethods response first.
                  (Platform.OS !== 'android' &&
                    (p.type === 'googlepay' || p.type === 'paywithgoogle'))
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
