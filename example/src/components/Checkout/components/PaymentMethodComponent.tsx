//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Button, View } from 'react-native';
import { AdyenComponent } from '@adyen/react-native';
import type {
  Checkout,
  CheckoutPaymentMethod,
  Controller,
} from '@adyen/react-native';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';

interface PaymentMethodComponentProps {
  checkout: Checkout;
  paymentMethod: CheckoutPaymentMethod;
  /** Button title for methods submitted on tap. */
  title?: string;
  /** Rendered above the payment method once its controller is available. */
  header?: ReactNode;
}

// Apple Pay's native component presents the payment sheet as soon as its view is mounted, so
// the shopper starts it from a button that calls `controller.submit()` instead.
const SUBMIT_ON_TAP = new Set(['applepay']);

/**
 * Renders an embedded `<AdyenComponent>` for a controller that needs UI, or a button calling
 * `controller.submit()` for one that does not (and for Apple Pay). A payment method that is
 * unavailable on this device or platform stays listed as a disabled entry without controls.
 */
const PaymentMethodComponent = ({
  checkout,
  paymentMethod,
  title,
  header,
}: PaymentMethodComponentProps) => {
  const [controller, setController] = useState<Controller | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setController(null);
    setUnavailable(false);
    let active = true;
    const resolveController = async () => {
      try {
        if (!(await checkout.isAvailable(paymentMethod))) {
          if (active) setUnavailable(true);
          return;
        }
        const created = await checkout.createController(paymentMethod);
        if (active) {
          setController(created);
        }
      } catch {
        if (active) {
          setController(null);
          setUnavailable(true);
        }
      }
    };
    resolveController();
    return () => {
      active = false;
    };
  }, [checkout, paymentMethod]);

  const onPress = useCallback(() => {
    controller?.submit().catch(() => setController(null));
  }, [controller]);

  const name = title ?? paymentMethod.name ?? paymentMethod.type;
  const entryId = `payment-method-${paymentMethod.id}`;

  if (unavailable) {
    return (
      <View
        style={Styles.padded}
        testID={entryId}
        accessibilityLabel={`${entryId}-unavailable`}
        accessibilityState={{ disabled: true }}
      >
        <AdaptiveText style={Styles.paddedTitle}>
          {`${name} (unavailable)`}
        </AdaptiveText>
      </View>
    );
  }

  if (!controller) {
    return null;
  }

  if (
    controller.requiresUserInteraction &&
    !SUBMIT_ON_TAP.has(paymentMethod.type)
  ) {
    return (
      <View testID={entryId} collapsable={false}>
        {header}
        <AdyenComponent controller={controller} />
      </View>
    );
  }

  return (
    <View testID={entryId} collapsable={false}>
      {header}
      <View style={Styles.padded}>
        <Button
          testID={`submit-${paymentMethod.type}`}
          title={name}
          onPress={onPress}
        />
      </View>
    </View>
  );
};

export default PaymentMethodComponent;
