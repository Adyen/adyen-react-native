//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import NativeAdyenCheckoutComponentView, {
  type LayoutChangeEvent,
} from '../specs/NativeAdyenCheckoutComponentView';
import type { Checkout, CheckoutTarget } from '../core';
import { checkoutHandleFor } from '../checkout/createCheckout';

const styles = StyleSheet.create({
  container: { width: '100%' },
});

let nextPresenterID = 0;

function presenterID(): string {
  nextPresenterID += 1;
  return `presenter-${nextPresenterID}`;
}

/**
 * Props for {@link AdyenComponent}. `type` is retained temporarily as a regular-method shorthand;
 * new code should use `target` so stored payment methods retain their exact ID.
 */
export interface AdyenComponentProps {
  checkout: Checkout;
  target?: CheckoutTarget;
  type?: string;
}

function resolveTarget(
  target: CheckoutTarget | undefined,
  type: string | undefined
): CheckoutTarget | undefined {
  if (target) return target;
  return type ? { kind: 'paymentMethod', type } : undefined;
}

/** Generic embedded payment view bound to one opaque checkout and presenter identity. */
export const AdyenComponent: React.FC<AdyenComponentProps> = ({
  checkout,
  target,
  type,
}) => {
  const nativeRef = useRef(null);
  const privatePresenterID = useRef(presenterID()).current;
  const [size, setSize] = useState<LayoutChangeEvent>();
  const handle = checkoutHandleFor(checkout);
  const checkoutTarget = resolveTarget(target, type);

  const handleLayoutChange = useCallback(
    (event: { nativeEvent: LayoutChangeEvent }) => setSize(event.nativeEvent),
    []
  );

  if (!handle || !checkoutTarget) {
    return null;
  }

  return (
    <NativeAdyenCheckoutComponentView
      ref={nativeRef}
      checkoutId={handle.checkoutId}
      presenterId={privatePresenterID}
      targetKind={checkoutTarget.kind}
      targetValue={
        checkoutTarget.kind === 'paymentMethod'
          ? checkoutTarget.type
          : checkoutTarget.id
      }
      onLayoutChange={handleLayoutChange}
      style={[styles.container, { height: size?.height }]}
    />
  );
};
