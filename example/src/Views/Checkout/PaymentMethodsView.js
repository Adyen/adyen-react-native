// @ts-check

import React, { useCallback } from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import {
  Button,
  View,
  Platform,
  ScrollView,
  Text,
  useColorScheme,
} from 'react-native';
import Styles from '../../Utilities/Styles';

const PaymentMethods = () => {
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();
  const paymentMethods = paymentMethodsResponse?.paymentMethods;

  const isAvailable = useCallback(
    (/** @type {string} */ type) => {
      return (
        paymentMethods &&
        paymentMethods.some(
          (pm) => pm.type.toLowerCase() === type.toLowerCase()
        )
      );
    },
    [paymentMethods]
  );

  if (paymentMethods === undefined) {
    return <NoPaymentMethodsView />;
  }

  return (
    <ScrollView>
      <View style={Styles.content}>
        <View style={Styles.item}>
          <Button
            title="dropin"
            onPress={() => {
              start('dropin');
            }}
          />
        </View>

        {paymentMethods.map((p) => {
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

const NoPaymentMethodsView = () => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View>
      <Text
        style={[
          Styles.centeredText,
          isDarkMode ? Styles.textDark : Styles.textLight,
        ]}
      >
        PaymentMethods not defined
      </Text>
    </View>
  );
};

export default PaymentMethods;
