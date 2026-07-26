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
  /** Called when the card component becomes ready, or stops being ready, for external submission. */
  onReadyChange?: (isReady: boolean) => void;
}

/** Imperative controls exposed by {@link CardView}. */
export interface CardViewHandle {
  /** Submit the native card component. Returns false when the component is not ready. */
  submit(): boolean;
}

const PAYMENT_METHOD_TYPE = 'scheme';

/**
 * Type-safe wrapper for the native CardView component.
 * Automatically serializes PaymentMethod and Configuration objects to JSON strings.
 */
export const CardView = React.forwardRef<CardViewHandle, CardViewProps>(
  function CardViewComponent({ paymentMethod, onReadyChange }, ref) {
    const { config, paymentMethods } = useAdyenCheckout();
    const { subscribe, unsubscribe } = useComponent();
    const nativeRef = useRef(null);
    const subscribedKey = useRef<string | null>(null);
    const onReadyChangeRef = useRef(onReadyChange);
    const hasLayoutRef = useRef(false);
    const isReadyRef = useRef(false);

    const [size, setSize] = useState<LayoutChangeEvent>();

    const updateReady = useCallback((isReady: boolean) => {
      if (isReadyRef.current === isReady) return;

      isReadyRef.current = isReady;
      onReadyChangeRef.current?.(isReady);
    }, []);

    const handleLayoutChange = useCallback(
      (event: { nativeEvent: LayoutChangeEvent }) => {
        hasLayoutRef.current = event.nativeEvent.height > 0;
        updateReady(subscribedKey.current !== null && hasLayoutRef.current);
        setSize(event.nativeEvent);
      },
      [updateReady]
    );

    const _paymentMethod = useMemo(
      () =>
        paymentMethod ??
        paymentMethods?.paymentMethods?.find(
          (x) => x.type === PAYMENT_METHOD_TYPE
        ),
      [paymentMethod, paymentMethods]
    );
    const hasPaymentMethod = _paymentMethod != null;

    useEffect(() => {
      onReadyChangeRef.current = onReadyChange;
      onReadyChange?.(isReadyRef.current);
    }, [onReadyChange]);

    useEffect(() => {
      if (hasPaymentMethod) return;

      hasLayoutRef.current = false;
      setSize(undefined);
    }, [hasPaymentMethod]);

    useImperativeHandle(
      ref,
      () => ({
        submit() {
          const viewId = subscribedKey.current;
          if (viewId === null || !isReadyRef.current) return false;

          EmbeddedComponentBus.submit(viewId);
          return true;
        },
      }),
      []
    );

    useEffect(() => {
      if (!hasPaymentMethod) return;

      const tag = findNodeHandle(nativeRef.current);
      if (tag == null) return;

      const key = String(tag);
      const removeAvailabilityListener =
        EmbeddedComponentBus.addSubmissionAvailabilityListener(
          key,
          (isAvailable) => updateReady(isAvailable && hasLayoutRef.current)
        );
      subscribe(key);
      subscribedKey.current = key;
      updateReady(hasLayoutRef.current);
      return () => {
        hasLayoutRef.current = false;
        subscribedKey.current = null;
        updateReady(false);
        removeAvailabilityListener();
        unsubscribe(key);
      };
    }, [hasPaymentMethod, subscribe, unsubscribe, updateReady]);

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
