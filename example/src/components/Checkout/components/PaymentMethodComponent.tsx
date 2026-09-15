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
  /** Button title shown when the method is direct/headless, or Apple Pay (see the TODO below). */
  title?: string;
}

type Availability = 'unavailable' | 'needsInteraction' | 'direct';

/**
 * TODO: iOS's `ApplePayComponent.viewController` is the `PKPaymentAuthorizationViewController`
 * itself (meant for modal presentation), not an inline "tap to pay" button the way Android's
 * GooglePayComponent renders one - so mounting `<AdyenComponent type="applepay">` immediately
 * presents the system sheet, with no button tap involved. A future SDK version will make Apple
 * Pay render its own inline button first, matching Google Pay, with `checkout.submit("applepay")`
 * available for consumers who want to skip straight to the sheet. Until then, gate mounting
 * behind our own button as a temporary hack - Google Pay needs no such gate, its own inline
 * button already is the tap.
 */
const NEEDS_TAP_GATE_HACK = new Set(['applepay']);

/**
 * Renders the given payment method as:
 * - nothing, if it isn't offered by the current checkout, or the device/platform reports it
 *   unavailable (e.g. Apple Pay or Google Pay with no cards configured)
 * - an embedded `<AdyenComponent>`, if it needs the shopper to fill in details with UI embedded
 *   inline in the checkout screen (e.g. Card, Google Pay's own button)
 * - a plain button, if it's a direct/headless method with no UI of its own (e.g. PayPal,
 *   Klarna), calling `checkout.submit(type)` directly, or Apple Pay (see the TODO above),
 *   mounting `<AdyenComponent>` - and so presenting its sheet - only once tapped
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
