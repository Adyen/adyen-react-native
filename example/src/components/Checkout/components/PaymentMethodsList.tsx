//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { Fragment, useMemo } from 'react';
import { View } from 'react-native';
import type { Checkout, CheckoutPaymentMethod } from '@adyen/react-native';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import PageScrollView from '../../common/PageScrollView';
import TopView from './TopView';
import PaymentMethodComponent from './PaymentMethodComponent';

interface PaymentMethodsListProps {
  checkout: Checkout;
}

const CARD_TYPE = 'scheme';
const TITLES: Record<string, string> = {
  applepay: 'Pay with Apple Pay',
  paypal: 'Pay with PayPal',
  klarna_paynow: 'Pay with Klarna',
};

const cardFirst = (
  paymentMethods: Iterable<CheckoutPaymentMethod>
): CheckoutPaymentMethod[] => {
  const list = Array.from(paymentMethods);
  return [
    ...list.filter((paymentMethod) => paymentMethod.type === CARD_TYPE),
    ...list.filter((paymentMethod) => paymentMethod.type !== CARD_TYPE),
  ];
};

/** Every regular payment method of the checkout, card first, for either flow. */
const PaymentMethodsList = ({ checkout }: PaymentMethodsListProps) => {
  const paymentMethods = useMemo(
    () => cardFirst(checkout.paymentMethods.regular),
    [checkout]
  );

  return (
    <View style={Styles.page}>
      <TopView />
      <PageScrollView>
        {paymentMethods.map((paymentMethod) => (
          <Fragment key={paymentMethod.id}>
            {paymentMethod.type === CARD_TYPE ? (
              <AdaptiveText style={Styles.paddedTitle}>Card</AdaptiveText>
            ) : null}
            <PaymentMethodComponent
              checkout={checkout}
              paymentMethod={paymentMethod}
              title={TITLES[paymentMethod.type]}
            />
          </Fragment>
        ))}
      </PageScrollView>
    </View>
  );
};

export default PaymentMethodsList;
