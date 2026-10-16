import { useMemo } from 'react';
import { View } from 'react-native';
import type { Checkout } from '@adyen/react-native';
import type { StoredCardPaymentMethod } from '../../../api/types';
import AdaptiveText from '../../common/AdaptiveText';
import PaymentMethodListItem from './PaymentMethodListItem';
import PaymentMethodComponent from './PaymentMethodComponent';
import Styles from '../../common/Styles';

interface StoredPaymentMethodsListProps {
  checkout: Checkout;
}

const SUPPORTED_STORED_TYPES = new Set(['scheme']);

/**
 * Renders a controller for every supported stored payment method of the checkout, or an empty
 * state when the shopper has none.
 */
const StoredPaymentMethodsList = ({
  checkout,
}: StoredPaymentMethodsListProps) => {
  const storedCards = useMemo(
    () =>
      Array.from(checkout.paymentMethods.stored)
        .filter((paymentMethod) =>
          SUPPORTED_STORED_TYPES.has(paymentMethod.type)
        )
        .map((paymentMethod) => paymentMethod as StoredCardPaymentMethod),
    [checkout]
  );

  if (storedCards.length === 0) {
    return (
      <View style={Styles.centeredContent}>
        <AdaptiveText style={Styles.paddedTitle}>
          No stored payment methods available. Please add a card first.
        </AdaptiveText>
      </View>
    );
  }

  return (
    <View>
      <AdaptiveText style={Styles.paddedTitle}>Stored payments</AdaptiveText>
      {storedCards.map((paymentMethod) => (
        <PaymentMethodComponent
          key={paymentMethod.id}
          checkout={checkout}
          paymentMethod={paymentMethod}
          title={`Pay with ${storedTitle(paymentMethod)}`}
          header={
            <PaymentMethodListItem
              title={storedTitle(paymentMethod)}
              subtitle={storedSubtitle(paymentMethod)}
              icon={paymentMethod.brand ?? 'card'}
            />
          }
        />
      ))}
    </View>
  );
};

function storedSubtitle(paymentMethod: StoredCardPaymentMethod): string {
  return `exp ${paymentMethod.expiryMonth}/${paymentMethod.expiryYear}`;
}

function storedTitle(paymentMethod: StoredCardPaymentMethod): string {
  return `**** ${paymentMethod.lastFour}`;
}

export default StoredPaymentMethodsList;
