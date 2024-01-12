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
  const regularPaymentMethods = paymentMethodsResponse?.paymentMethods ?? [];
  const storedPaymentMethods = paymentMethodsResponse?.storedPaymentMethods;

  const isNotReady = paymentMethodsResponse === undefined;
  const isDarkMode = useColorScheme() === 'dark';

  const subtitle = (/** @type {import('@adyen/react-native').StoredPaymentMethod} */ pm) => {
    switch (pm.type) {
      case 'scheme':
        return `**** **** **** ${pm['lastFour']} (exp ${pm['expiryMonth']}/${pm['expiryYear']})`
      default:
        return `${pm.id}`
    }
  }

  return (
    <ScrollView>
      <View style={Styles.content}>
        <View>
          <Button
            title="Drop-in"
            disabled={isNotReady}
            onPress={() => {
              start('dropin');
            }}
          />
        </View>

        {storedPaymentMethods ? (
          <View>
            <Text style={isDarkMode ? Styles.textDark : Styles.textLight}> Stored payments </Text>
            {storedPaymentMethods.map((p) => {
              const iconName = p.type === 'scheme' ? 'card' : p.type;
              return (
                <View key={`stored-payment-method-${p.id}`}>
                  <PaymentMethodButton
                    title={`${p.name}`}
                    subtitle={subtitle(p)}
                    icon={iconName}
                    onPress={() => {
                      start(p.id);
                    }}
                  />
                </View>
              );
            })}
          </View>
        ) : (<View />)}

        <Text style={isDarkMode ? Styles.textDark : Styles.textLight}> Components </Text>
        {regularPaymentMethods.map((p) => {
          const iconName = p.type === 'scheme' ? 'card' : p.type;
          return (
            <View key={`${p.type + p.name}`}>
              <PaymentMethodButton
                title={`${p.name}`}
                subtitle={undefined}
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

const PaymentMethodButton = ({ onPress, title, subtitle, icon }) => {
  const iconURI = `https://checkoutshopper-${ENVIRONMENT.environment}.adyen.com/checkoutshopper/images/logos/small/${icon}@3x.png`;

  return (
    <TouchableHighlight
      onPress={onPress}
      style={Styles.btnClickContain}
      underlayColor="#042417"
    >
      <View style={Styles.btnContainer}>
        <Image source={{ uri: iconURI }} style={Styles.btnIcon} />
        <View style={Styles.content}>
          <Text style={Styles.btnText}>{title}</Text>
          {subtitle ? (<Text style={Styles.btnText}>{subtitle}</Text>) : (<View />)}
        </View>
      </View>
    </TouchableHighlight>
  );
};

export default PaymentMethods;
