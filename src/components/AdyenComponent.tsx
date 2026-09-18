//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, StyleSheet } from 'react-native';
import NativeAdyenComponentView, {
  type LayoutChangeEvent,
} from '../specs/NativeAdyenComponentView';
import type { Checkout } from '../core';

const styles = StyleSheet.create({
  container: { width: '100%' },
});

// The `AdyenComponent` bridge module exposes no JS-callable methods — every `<AdyenComponent>`
// view talks to it purely on the native side (e.g. iOS reads `ComponentModule.shared`). React
// Native only constructs a bridge module the first time JS touches it, so without this, iOS never
// builds `ComponentModule` and `ComponentModule.shared` stays nil when the first view mounts.
// Referencing it here, at import time, forces that construction before any view can need it.
void NativeModules.AdyenComponent; // eslint-disable-line no-void

/** Types with a live `<AdyenComponent>` mounted; rejects mounting a duplicate type. */
const activeComponentTypes = new Set<string>();

const duplicateTypeError = (type: string): string =>
  `An <AdyenComponent> with type "${type}" is already mounted. ` +
  `Only a single component per type may be mounted at a time.`;

/**
 * Props for {@link AdyenComponent}.
 */
export interface AdyenComponentProps {
  /** The active {@link Checkout} returned by `AdyenCheckout.setup()`/`setupAdvanced()`. */
  checkout: Checkout;
  /** Payment method type to render (e.g. `"scheme"`, `"ideal"`, `"googlepay"`, `"applepay"`). */
  type: string;
}

/**
 * Generic embedded payment view. Renders the native payment component for the given `type`.
 * Subscribes to nothing — callbacks are global on the checkout, not per view.
 */
export const AdyenComponent: React.FC<AdyenComponentProps> = ({
  checkout,
  type,
}) => {
  // Defensive guard for untyped (JS) callers; TypeScript already requires `checkout`.
  if (!checkout) {
    throw new Error(
      'AdyenComponent requires a `checkout` obtained from AdyenCheckout.setup()/AdyenCheckout.setupAdvanced().'
    );
  }

  // Read from checkout prop directly — no provider context needed
  const { configuration } = checkout;
  const nativeRef = useRef(null);
  const [size, setSize] = useState<LayoutChangeEvent>();

  const handleLayoutChange = useCallback(
    (event: { nativeEvent: LayoutChangeEvent }) => setSize(event.nativeEvent),
    []
  );

  // Reject a second component for the same payment method type.
  useEffect(() => {
    if (activeComponentTypes.has(type)) {
      throw new Error(duplicateTypeError(type));
    }
    activeComponentTypes.add(type);
    return () => {
      activeComponentTypes.delete(type);
    };
  }, [type]);

  // Configuration is null until setup()/setupAdvanced() has been called.
  if (!configuration) {
    return null;
  }

  return (
    <NativeAdyenComponentView
      ref={nativeRef}
      type={type}
      configuration={JSON.stringify(configuration)}
      onLayoutChange={handleLayoutChange}
      style={[styles.container, { height: size?.height }]}
    />
  );
};
