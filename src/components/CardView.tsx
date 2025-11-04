import React, { useMemo } from 'react';
import NativeCardView from '../specs/NativeCardView';
import { useAdyenCheckout } from '../hooks/useAdyenCheckout';
import type { PaymentMethod } from '../core/types';

export interface CardViewProps {
  /** PaymentMethod object. If not provided, the first available payment method will be used. */
  paymentMethod?: PaymentMethod;
  /** Show payment button */
  showButton?: boolean;
  /** Button press event handler */
  onButtonPress?: () => void;
}

/**
 * Type-safe wrapper for the native CardView component.
 * Automatically serializes PaymentMethod and Configuration objects to JSON strings.
 */
export const CardView: React.FC<CardViewProps> = ({
  paymentMethod,
  showButton,
  onButtonPress,
}) => {
  const { config, paymentMethods } = useAdyenCheckout();

  const type = 'scheme';

  const _paymentMethod = useMemo(
    () =>
      paymentMethod ??
      paymentMethods?.paymentMethods?.find((x) => x.type === type),
    [paymentMethod, paymentMethods]
  );

  const handleButtonPress = React.useCallback(() => {
    onButtonPress?.();
  }, [onButtonPress]);

  return (
    <NativeCardView
      paymentMethod={JSON.stringify(_paymentMethod)}
      configuration={JSON.stringify(config)}
      showButton={showButton}
      onButtonPress={onButtonPress ? handleButtonPress : undefined}
      style={{ minHeight: 100 }}
    />
  );
};
