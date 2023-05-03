// @ts-check

import React, { useCallback } from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import {
  Button,
  View,
  ScrollView,
  TouchableHighlight,
  Image,
  Text,
} from 'react-native';
import Styles from '../../Utilities/Styles';
import { ENVIRONMENT } from '../../Configuration';

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
          const iconName = p.type === 'scheme' ? 'card' : p.type;
          const iconURL = `https://checkoutshopper-${ENVIRONMENT.environment}.adyen.com/checkoutshopper/images/logos/small/${iconName}@3x.png`;
          return (
            <View key={`${p.type + p.name}`}>
              <PaymentMethodButton
                title={`${p.name}`}
                icon={iconURL}
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

const PaymentMethodButton = (props) => {
  const { onPress, title, icon } = props;

  return (
    <TouchableHighlight
      onPress={onPress}
      style={Styles.btnClickContain}
      underlayColor="#042417"
    >
      <View style={Styles.btnContainer}>
        <Image source={{ uri: icon }} style={Styles.btnIcon} />
        <Text style={Styles.btnText}>{title}</Text>
      </View>
    </TouchableHighlight>
  );
};

export default PaymentMethods;
