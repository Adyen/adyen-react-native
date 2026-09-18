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
  /** Button title for direct/headless methods (and Apple Pay's tap gate). */
  title?: string;
}

type Availability = 'unavailable' | 'needsInteraction' | 'direct';

// TODO: Apple Pay's native component presents the sheet immediately on mount (no inline button
// like Google Pay), so we gate it behind our own tap button until the SDK adds one.
const NEEDS_TAP_GATE_HACK = new Set(['applepay']);

/**
 * Renders a payment method embedded `<AdyenComponent>` (needs UI),
 * or a plain button calling `checkout.submit(type)` (direct/headless, or Apple Pay's tap gate).
 * If it isn't offered by the current checkout, or the device/platform reports it unavailable,
 * it renders nothing.
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
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

  const onPress = useCallback(() => {
    if (NEEDS_TAP_GATE_HACK.has(type)) {
      setIsOpen(true);
    } else {
      checkout.submit(type);
    }
  }, [checkout, type]);

  if (availability === 'needsInteraction' && NEEDS_TAP_GATE_HACK.has(type)) {
    return isOpen ? (
      <AdyenComponent checkout={checkout} type={type} />
    ) : (
      <View style={Styles.padded}>
        <Button
          testID={`submit-${type}`}
          title={title ?? type}
          onPress={onPress}
        />
      </View>
    );
  }

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
