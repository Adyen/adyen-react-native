import { useEffect, useState } from 'react';
import { AdyenComponent } from '@adyen/react-native';
import type { Checkout } from '@adyen/react-native';

interface AvailablePaymentComponentProps {
  checkout: Checkout;
  type: string;
}

/**
 * Renders an `<AdyenComponent>` for the given type only when the checkout offers
 * it and the device reports it as available. Used for platform-pay methods whose
 * controllers only exist on supported devices.
 */
const AvailablePaymentComponent = ({
  checkout,
  type,
}: AvailablePaymentComponentProps) => {
  const isOffered = (checkout.paymentMethods.paymentMethods ?? []).some(
    (paymentMethod) => paymentMethod.type === type
  );
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!isOffered) {
      setAvailable(false);
      return;
    }
    let active = true;
    checkout
      .isAvailable(type)
      .then((result) => {
        if (active) {
          setAvailable(result);
        }
      })
      .catch(() => {
        if (active) {
          setAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [checkout, type, isOffered]);

  if (!available) {
    return null;
  }

  return <AdyenComponent checkout={checkout} type={type} />;
};

export default AvailablePaymentComponent;
