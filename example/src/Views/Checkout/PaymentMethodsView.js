// @ts-check

import React from 'react';
import { useAdyenCheckout } from '@adyen/react-native';
import {
  Button,
  View,
  ScrollView,
  TouchableHighlight,
  Image,
  Text,
  useColorScheme,
} from 'react-native';
import Styles from '../../Utilities/Styles';
import { ENVIRONMENT } from '../../Configuration';

const PaymentMethods = () => {
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();
  const regularPaymentMethods = paymentMethodsResponse?.paymentMethods;

  const isNotReady = paymentMethodsResponse === undefined;

  if (regularPaymentMethods === undefined) {
    return <NoPaymentMethodsView />;
  }

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

        <View style={{ height: 16 }} />

        {regularPaymentMethods.map((p) => {
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

const PaymentMethodButton = ({ onPress, title, icon }) => {
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
