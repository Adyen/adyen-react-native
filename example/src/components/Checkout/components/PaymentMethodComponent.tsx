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
 * `controller.submit()` for one that does not (and for Apple Pay). Renders nothing when the
 * payment method is unavailable on this device or platform.
 */
const PaymentMethodComponent = ({
  checkout,
  paymentMethod,
  title,
  header,
}: PaymentMethodComponentProps) => {
  const [controller, setController] = useState<Controller | null>(null);

  useEffect(() => {
    setController(null);
    let active = true;
    const resolveController = async () => {
      try {
        if (!(await checkout.isAvailable(paymentMethod))) return;
        const created = await checkout.createController(paymentMethod);
        if (active) {
          setController(created);
        }
      } catch {
        if (active) {
          setController(null);
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

  if (!controller) {
    return null;
  }

  if (
    controller.requiresUserInteraction &&
    !SUBMIT_ON_TAP.has(paymentMethod.type)
  ) {
    return (
      <>
        {header}
        <AdyenComponent controller={controller} />
      </>
    );
  }

  return (
    <>
      {header}
      <View style={Styles.padded}>
        <Button
          testID={`submit-${paymentMethod.type}`}
          title={title ?? paymentMethod.name ?? paymentMethod.type}
          onPress={onPress}
        />
      </View>
    </>
  );
};

export default PaymentMethodComponent;
