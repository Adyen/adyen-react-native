import React, { useEffect, useMemo, useState } from 'react';
import NativeCardView, {
  type LayoutChangeEvent,
} from '../specs/NativeCardView';
import { useAdyenCheckout } from '../hooks/useAdyenCheckout';
import type { PaymentMethod } from '../core/types';
import Styles from './common/Styles';
import { useComponent } from '../hooks/useComponent';

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
  const { subscribe, unsubscribe } = useComponent();

  const [size, setSize] = useState<LayoutChangeEvent>();

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

  useEffect(() => {
    subscribe(type);
    return () => {
      unsubscribe(type);
    };
  }, [subscribe, unsubscribe]);

  useEffect(() => {
    if (!_paymentMethod) {
      console.error(`No payment method found for type ${type}`);
    }
  }, [_paymentMethod]);

  if (!_paymentMethod) {
    return null;
  }

  return (
    <NativeCardView
      paymentMethod={JSON.stringify(_paymentMethod)}
      configuration={JSON.stringify(config)}
      showButton={showButton}
      onButtonPress={onButtonPress ? handleButtonPress : undefined}
      onLayoutChange={(event) => {
        setSize(event.nativeEvent);
      }}
      style={{
        minHeight: Styles.defaultComponent.minHeight,
        height: size?.height,
        width: size?.width,
      }}
    />
  );
};
