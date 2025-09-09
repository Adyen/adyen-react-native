// @ts-check

import { AdyenAction, ResultCode, useAdyenCheckout } from '@adyen/react-native';
import {
  Button,
  View,
  ScrollView,
  Text,
  useColorScheme,
  Alert,
} from 'react-native';
import Styles from '../../utilities/Styles';
import { payByID } from '../utils/payByID';
import { useAppContext } from '../../../hooks/useAppContext';
import PaymentMethodButton from './PaymentMethodButton';
import { isSuccess } from '../../utilities/isSuccess';
import type {
  PaymentResponse,
  StoredCardPaymentMethod,
} from '../../../api/types';
import { storedSubtitle } from '../utils/storedSubtitle';
import { storedIcon } from '../utils/storedIcon';
import { storedTitle } from '../utils/storedTitle';

const PaymentMethods = ({ showComponents }: { showComponents: boolean }) => {
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

        {showComponents ? ( // Sessions do not support components (yet)
          <View>
            {storedPaymentMethods ? (
              <View>
                <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
                  Stored payments
                </Text>
                {storedPaymentMethods.map((p: StoredCardPaymentMethod) => {
                  return (
                    <View key={`${p.id}`}>
                      <PaymentMethodButton
                        title={storedTitle(p)}
                        subtitle={storedSubtitle(p)}
                        icon={storedIcon(p)}
                        onPress={async () => {
                          let result: PaymentResponse;
                          try {
                            let cvv =
                              '737'; /** Collect CVV from shopper if nececery */
                            result = await payByID(p.id, cvv, configuration);
                            Alert.alert('Result', result.resultCode);
                          } catch (e) {
                            result = {
                              resultCode: ResultCode.error,
                            };
                            Alert.alert('Error', String(e));
                          }
                          AdyenAction.hide(isSuccess(result.resultCode));
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
