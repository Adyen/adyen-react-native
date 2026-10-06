//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { View } from 'react-native';
import { AdyenComponent } from '@adyen/react-native';
import type { Checkout } from '@adyen/react-native';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import PageScrollView from '../../common/PageScrollView';
import TopView from './TopView';
import PaymentMethodComponent from './PaymentMethodComponent';

interface PaymentMethodsListProps {
  checkout: Checkout;
}

/** Embedded card form plus the example's other payment methods, for either flow. */
const PaymentMethodsList = ({ checkout }: PaymentMethodsListProps) => (
  <View style={Styles.page}>
    <TopView />
    <PageScrollView>
      <AdaptiveText style={Styles.paddedTitle}>Card</AdaptiveText>
      <AdyenComponent checkout={checkout} type="scheme" />
      <PaymentMethodComponent
        checkout={checkout}
        type="applepay"
        title="Pay with Apple Pay"
      />
      <PaymentMethodComponent checkout={checkout} type="googlepay" />
      <PaymentMethodComponent
        checkout={checkout}
        type="paypal"
        title="Pay with PayPal"
      />
      <PaymentMethodComponent
        checkout={checkout}
        type="klarna_paynow"
        title="Pay with Klarna"
      />
    </PageScrollView>
  </View>
);

export default PaymentMethodsList;
