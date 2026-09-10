//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { useEffect, useState, useCallback } from 'react';
import { Button, View } from 'react-native';
import { AdyenComponent } from '@adyen/react-native';
import type { Checkout } from '@adyen/react-native';
import Styles from '../../common/Styles';

interface PaymentMethodComponentProps {
  checkout: Checkout;
  type: string;
  /** Button title shown when the method is direct/headless (no UI of its own). */
  title?: string;
}

type Availability = 'unavailable' | 'needsInteraction' | 'direct';

/**
 * Renders the given payment method as:
 * - nothing, if it isn't offered by the current checkout, or the device/platform reports it
 *   unavailable (e.g. Apple Pay or Google Pay with no cards configured)
 * - an embedded `<AdyenComponent>`, if it needs the shopper to fill in details or otherwise
 *   present UI (e.g. Card, Apple Pay, Google Pay)
 * - a plain button that calls `checkout.submit(type)` directly, if it's a direct/headless
 *   method with no UI of its own (e.g. PayPal, Klarna)
 *
 * Every payment method needs both an availability check and a UI-vs-headless check in general;
 * there's no harm running both regardless of type; the AvailablePaymentComponent
 * (platform-pay-only) / PayableComponent (headless-only) split that preceded this component was
 * unnecessary.
 */
const PaymentMethodComponent = ({
  checkout,
  type,
  title,
}: PaymentMethodComponentProps) => {
  const isOffered = (checkout.paymentMethods.paymentMethods ?? []).some(
    (paymentMethod) => paymentMethod.type === type
  );
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    if (!isOffered) {
      setAvailability(null);
      return;
    }
    let active = true;
    const resolveAvailability = async () => {
      try {
        const available = await checkout.isAvailable(type);
        if (!active) return;
        if (!available) {
          setAvailability('unavailable');
          return;
        }
        const needsInteraction = await checkout.requiresUserInteraction(type);
        if (active) {
          setAvailability(needsInteraction ? 'needsInteraction' : 'direct');
        }
      } catch {
        if (active) {
          setAvailability('unavailable');
        }
      }
    };
    resolveAvailability();
    return () => {
      active = false;
    };
  }, [checkout, type, isOffered]);

  const onPress = useCallback(() => checkout.submit(type), [checkout, type]);

  switch (availability) {
    case 'needsInteraction':
      return <AdyenComponent checkout={checkout} type={type} />;
    case 'direct':
      return (
        <View style={Styles.padded}>
          <Button
            testID={`submit-${type}`}
            title={title ?? type}
            onPress={onPress}
          />
        </View>
      );
    default:
      return null;
  }
};

export default PaymentMethodComponent;
