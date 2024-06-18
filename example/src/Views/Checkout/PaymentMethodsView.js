// @ts-check

import React from 'react';
import { AdyenAction, useAdyenCheckout } from '@adyen/react-native';
import {
  Button,
  View,
  ScrollView,
  TouchableHighlight,
  Image,
  Text,
  useColorScheme,
  Alert,
} from 'react-native';
import Styles from '../../Utilities/Styles';
import { ENVIRONMENT } from '../../Configuration';
import { payByID } from '../../Utilities/payByID';
import { useAppContext } from '../../Utilities/AppContext';

const PaymentMethods = ({ isSession }) => {
  const { configuration } = useAppContext();
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();
  const regularPaymentMethods = paymentMethodsResponse?.paymentMethods ?? [];
  const storedPaymentMethods = paymentMethodsResponse?.storedPaymentMethods;

  const isNotReady = paymentMethodsResponse === undefined;
  const isDarkMode = useColorScheme() === 'dark';

  const subtitle = (
    /** @type {import('@adyen/react-native').StoredPaymentMethod} */ pm
  ) => {
    switch (pm.type) {
      case 'scheme':
        return `**** **** **** ${pm.lastFour} (exp ${pm.expiryMonth}/${pm.expiryYear})`;
      default:
        return `${pm.id}`;
    }
  };

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

        {!isSession ? ( // Sessions do not support components (yet)
          <View>
            {storedPaymentMethods ? (
              <View>
                <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
                  Stored payments
                </Text>
                {storedPaymentMethods.map((p) => {
                  const iconName = p.type === 'scheme' ? 'card' : p.type;
                  return (
                    <View key={`${p.id}`}>
                      <PaymentMethodButton
                        title={`${p.name}`}
                        subtitle={subtitle(p)}
                        icon={iconName}
                        onPress={async () => {
                          try {
                            let cvv =
                              '737'; /** Collect CVV from shopper if nececery */
                            let result = await payByID(
                              p.id,
                              cvv,
                              configuration
                            );
                            Alert.alert('Result', result.resultCode);
                          } catch (e) {
                            Alert.alert('Error', e.message);
                            AdyenAction.hide(false);
                          }
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View />
            )}

            <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
              Components
            </Text>
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
        ) : (
          <View />
        )}
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
          {subtitle ? <Text style={Styles.btnText}>{subtitle}</Text> : <View />}
        </View>
      </View>
    </TouchableHighlight>
  );
};

export default PaymentMethods;
