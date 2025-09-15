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
import type { PageProps } from '../../../State/RootStackParamList';
import { useCallback } from 'react';
import { icon } from '../utils/icon';

interface PaymentMethodsProps {
  showComponents: boolean;
  navigation?: PageProps['navigation'];
}

const PaymentMethods = ({
  showComponents,
  navigation,
}: PaymentMethodsProps) => {
  const { configuration } = useAppContext();
  const { start, paymentMethods: paymentMethodsResponse } = useAdyenCheckout();
  const regularPaymentMethods = paymentMethodsResponse?.paymentMethods ?? [];
  const storedCards = paymentMethodsResponse?.storedPaymentMethods?.filter(
    (paymentMethod) => paymentMethod.type === 'scheme'
  ) as StoredCardPaymentMethod[];

  const isNotReady = paymentMethodsResponse === undefined;
  const isDarkMode = useColorScheme() === 'dark';

  const makePayment = useCallback(
    async (p: StoredCardPaymentMethod) => {
      await handleStoredPayment(p, configuration, navigation);
    },
    [configuration, navigation]
  );

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
            {storedCards ? (
              <View>
                <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
                  Stored payments
                </Text>
                {storedCards.map((paymentMethod) => {
                  return (
                    <View key={`${paymentMethod.id}`}>
                      <PaymentMethodButton
                        title={storedTitle(paymentMethod)}
                        subtitle={storedSubtitle(paymentMethod)}
                        icon={storedIcon(paymentMethod)}
                        onPress={() => makePayment(paymentMethod)}
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
            {regularPaymentMethods.map((paymentMethod) => {
              return (
                <View key={paymentMethod.type + paymentMethod.name}>
                  <PaymentMethodButton
                    title={paymentMethod.name}
                    subtitle={undefined}
                    icon={icon(paymentMethod)}
                    onPress={() => {
                      start(paymentMethod.type);
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
