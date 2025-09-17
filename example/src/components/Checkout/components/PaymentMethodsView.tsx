import { useAdyenCheckout } from '@adyen/react-native';
import { Button, View, ScrollView } from 'react-native';
import Styles from '../../common/Styles';
import { useAppContext } from '../../../hooks/useAppContext';
import PaymentMethodButton from './PaymentMethodButton';
import type { StoredCardPaymentMethod } from '../../../api/types';
import { storedSubtitle } from '../utils/storedSubtitle';
import { storedIcon } from '../utils/storedIcon';
import { storedTitle } from '../utils/storedTitle';
import { handleStoredPayment } from '../utils/handleStoredPayment';
import type { PageProps } from '../../../State/RootStackParamList';
import { useCallback, useMemo } from 'react';
import { icon } from '../utils/icon';
import AdaptiveText from '../../common/AdaptiveText';

interface PaymentMethodsProps {
  showComponents: boolean;
  navigation?: PageProps['navigation'];
}

const PaymentMethods = ({
  showComponents,
  navigation,
}: PaymentMethodsProps) => {
  const { configuration } = useAppContext();
  const { start, isReady, paymentMethods } = useAdyenCheckout();

  const makePayment = useCallback(
    async (storedCard: StoredCardPaymentMethod) => {
      await handleStoredPayment(storedCard, configuration, navigation);
    },
    [configuration, navigation]
  );

  const regular = useMemo(() => {
    return paymentMethods?.paymentMethods ?? [];
  }, [paymentMethods]);

  const storedCards = useMemo(() => {
    return paymentMethods?.storedPaymentMethods?.filter(
      (paymentMethod) => paymentMethod.type === 'scheme'
    ) as StoredCardPaymentMethod[];
  }, [paymentMethods]);

  return (
    <ScrollView>
      <View style={Styles.padded}>
        <Button
          title="Drop-in"
          disabled={!isReady}
          onPress={() => {
            start('dropin');
          }}
        />
      </View>

      {showComponents ? (
        <View>
          {storedCards ? (
            <View>
              <AdaptiveText style={Styles.paddedTitle}>
                Stored payments
              </AdaptiveText>
              {storedCards.map((paymentMethod) => {
                return (
                  <PaymentMethodButton
                    key={`${paymentMethod.id}`}
                    title={storedTitle(paymentMethod)}
                    subtitle={storedSubtitle(paymentMethod)}
                    icon={storedIcon(paymentMethod)}
                    onPress={() => makePayment(paymentMethod)}
                  />
                );
              })}
            </View>
          ) : null}

          <AdaptiveText style={Styles.paddedTitle}>Components</AdaptiveText>
          {regular.map((paymentMethod) => {
            return (
              <PaymentMethodButton
                key={paymentMethod.type + paymentMethod.name}
                title={paymentMethod.name}
                subtitle={undefined}
                icon={icon(paymentMethod)}
                onPress={() => {
                  start(paymentMethod.type);
                }}
              />
            );
          })}
        </View>
      ) : null}
      <View style={Styles.scrollBottomPadding} />
    </ScrollView>
  );
};

export default PaymentMethods;
