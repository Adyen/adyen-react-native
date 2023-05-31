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

  const isNotReady = paymentMethodsResponse === undefined;

  return (
    <ScrollView>
      <View style={Styles.content}>
        <View style={Styles.item}>
          <Button
            title="Drop-in"
            disabled={isNotReady}
            onPress={() => {
              start('dropin');
            }}
          />
        </View>

        {paymentMethodsResponse?.paymentMethods.map((p) => {
          const iconName = p.type === 'scheme' ? 'card' : p.type;
          return (
            <View key={`${p.type + p.name}`}>
              <PaymentMethodButton
                title={`${p.name}`}
                icon={iconName}
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
  const iconURI = `https://checkoutshopper-${ENVIRONMENT.environment}.adyen.com/checkoutshopper/images/logos/small/${icon}@3x.png`;

  return (
    <TouchableHighlight
      onPress={onPress}
      style={Styles.btnClickContain}
      underlayColor="#042417"
    >
      <View style={Styles.btnContainer}>
        <Image source={{ uri: iconURI }} style={Styles.btnIcon} />
        <Text style={Styles.btnText}>{title}</Text>
      </View>
    </TouchableHighlight>
  );
};

export default PaymentMethods;
