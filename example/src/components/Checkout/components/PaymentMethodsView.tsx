// @ts-check

import { useAdyenCheckout } from '@adyen/react-native';
import { Button, View, ScrollView, Text, useColorScheme } from 'react-native';
import Styles from '../../utilities/Styles';
import { useAppContext } from '../../../hooks/useAppContext';
import PaymentMethodButton from './PaymentMethodButton';
import type { StoredCardPaymentMethod } from '../../../api/types';
import { storedSubtitle } from '../utils/storedSubtitle';
import { storedIcon } from '../utils/storedIcon';
import { storedTitle } from '../utils/storedTitle';
import { handleStoredPayment } from '../utils/handleStoredPayment';

interface PaymentMethodsProps {
  showComponents: boolean;
}

const PaymentMethods = ({ showComponents }: PaymentMethodsProps) => {
  const { configuration } = useAppContext();
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();
  const regularPaymentMethods = paymentMethodsResponse?.paymentMethods ?? [];
  const storedPaymentMethods =
    paymentMethodsResponse?.storedPaymentMethods as StoredCardPaymentMethod[];

  const isNotReady = paymentMethodsResponse === undefined;
  const isDarkMode = useColorScheme() === 'dark';

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

        {showComponents ? (
          <View>
            {storedPaymentMethods ? (
              <View>
                <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
                  Stored payments
                </Text>
                {storedPaymentMethods.map((p) => {
                  return (
                    <View key={`${p.id}`}>
                      <PaymentMethodButton
                        title={storedTitle(p)}
                        subtitle={storedSubtitle(p)}
                        icon={storedIcon(p)}
                        onPress={async () => {
                          await handleStoredPayment(p, configuration);
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

export default PaymentMethods;
