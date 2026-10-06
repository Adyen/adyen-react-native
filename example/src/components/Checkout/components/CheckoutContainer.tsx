//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Checkout } from '@adyen/react-native';
import Styles from '../../common/Styles';
import { useCheckout } from '../../../hooks/useCheckout';

interface CheckoutContainerProps {
  /** Creates the checkout. Memoize it with `useCallback`. */
  setup: () => Promise<Checkout>;
  children: (checkout: Checkout) => ReactNode;
}

/** Sets up a checkout and renders a loading or error state until it is ready. */
const CheckoutContainer = ({ setup, children }: CheckoutContainerProps) => {
  const { loading, error, checkout } = useCheckout(setup);

  if (loading) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !checkout) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>{error ?? 'Error'}</Text>
      </View>
    );
  }

  return <>{children(checkout)}</>;
};

export default CheckoutContainer;
