import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { findNodeHandle } from 'react-native';
import NativeCardView, {
  type LayoutChangeEvent,
} from '../specs/NativeCardView';
import { useAdyenCheckout } from '../hooks/useAdyenCheckout';
import type { PaymentMethod } from '../core/types';
import { useComponent } from '../hooks/useComponent';
import { EmbeddedComponentBus } from '../modules/embedded/EmbeddedComponentBus';

export interface CardViewProps {
  /** PaymentMethod object. If not provided, the first available payment method will be used. */
  paymentMethod?: PaymentMethod;
}

/** Imperative controls exposed by {@link CardView}. */
export interface CardViewHandle {
  /** Submit the native card component. */
  submit(): void;
}

const PAYMENT_METHOD_TYPE = 'scheme';

/**
 * Type-safe wrapper for the native CardView component.
 * Automatically serializes PaymentMethod and Configuration objects to JSON strings.
 */
export const CardView = React.forwardRef<CardViewHandle, CardViewProps>(
  function CardViewComponent({ paymentMethod }, ref) {
    const { config, paymentMethods } = useAdyenCheckout();
    const { subscribe, unsubscribe } = useComponent();
    const nativeRef = useRef(null);
    const subscribedKey = useRef<string | null>(null);

    const [size, setSize] = useState<LayoutChangeEvent>();

    const handleLayoutChange = useCallback(
      (event: { nativeEvent: LayoutChangeEvent }) => setSize(event.nativeEvent),
      []
    );

    const _paymentMethod = useMemo(
      () =>
        paymentMethod ??
        paymentMethods?.paymentMethods?.find(
          (x) => x.type === PAYMENT_METHOD_TYPE
        ),
      [paymentMethod, paymentMethods]
    );
    useImperativeHandle(
      ref,
      () => ({
        submit() {
          const viewId = subscribedKey.current;
          if (viewId !== null) {
            EmbeddedComponentBus.submit(viewId);
          }
        },
      }),
      []
    );

    useEffect(() => {
      const tag = findNodeHandle(nativeRef.current);
      if (tag == null) return;

      const key = String(tag);
      subscribedKey.current = key;
      subscribe(key);
      return () => {
        subscribedKey.current = null;
        unsubscribe(key);
      };
    }, [_paymentMethod, subscribe, unsubscribe]);

    useEffect(() => {
      if (!_paymentMethod) {
        console.error(
          `No payment method found for type ${PAYMENT_METHOD_TYPE}`
        );
      }
    }, [_paymentMethod]);

    if (!_paymentMethod) {
      return null;
    }

    return (
      <NativeCardView
        ref={nativeRef}
        paymentMethod={JSON.stringify(_paymentMethod)}
        configuration={JSON.stringify(config)}
        onLayoutChange={handleLayoutChange}
        style={{
          height: size?.height,
          width: '100%',
        }}
      />
    );
  }
);
