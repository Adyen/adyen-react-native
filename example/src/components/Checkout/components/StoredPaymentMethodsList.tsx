import type { StoredPaymentMethod } from '@adyen/react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import type { StoredCardPaymentMethod } from '../../../api/types';
import AdaptiveText from '../../common/AdaptiveText';
import PaymentMethodListItem from './PaymentMethodListItem';
import Styles from '../../common/Styles';

interface StoredPaymentMethodsListProps {
  storedPaymentMethods: StoredPaymentMethod[] | undefined;
  makePayment: (storedCard: StoredCardPaymentMethod) => void;
}

const StoredPaymentMethodsList = ({
  storedPaymentMethods,
  makePayment,
}: StoredPaymentMethodsListProps) => {
  const storedCards = useMemo(() => {
    return (
      storedPaymentMethods
        ?.filter((paymentMethod) => paymentMethod.type === 'scheme')
        .map((paymentMethod) => paymentMethod as StoredCardPaymentMethod) ?? []
    );
  }, [storedPaymentMethods]);

  if (storedCards.length === 0) {
    return null;
  }

  return (
    <View>
      <AdaptiveText style={Styles.paddedTitle}>Stored payments</AdaptiveText>
      {storedCards.map((paymentMethod) => {
        return (
          <PaymentMethodListItem
            key={`${paymentMethod.id}`}
            title={storedTitle(paymentMethod)}
            subtitle={storedSubtitle(paymentMethod)}
            icon={storedIcon(paymentMethod)}
            onPress={() => makePayment(paymentMethod)}
          />
        );
      })}
    </View>
  );
};

function storedIcon(paymentMethod: StoredCardPaymentMethod): string {
  switch (paymentMethod.type) {
    case 'scheme':
      return `${paymentMethod.brand ?? 'card'}`;
    default:
      return `${paymentMethod.type}`;
  }
}

function storedSubtitle(
  paymentMethod: StoredCardPaymentMethod
): string | undefined {
  switch (paymentMethod.type) {
    case 'scheme':
      return `exp ${paymentMethod.expiryMonth}/${paymentMethod.expiryYear}`;
    default:
      return undefined;
  }
}

function storedTitle(paymentMethod: StoredCardPaymentMethod): string {
  switch (paymentMethod.type) {
    case 'scheme':
      return `**** **** **** ${paymentMethod.lastFour}`;
    default:
      return `${paymentMethod.name}`;
  }
}

export default StoredPaymentMethodsList;
