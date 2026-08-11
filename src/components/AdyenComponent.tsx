//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { findNodeHandle, StyleSheet } from 'react-native';
import NativeAdyenComponentView, {
  type LayoutChangeEvent,
} from '../specs/NativeAdyenComponentView';
import type { Checkout } from '../core';
import { useComponent } from '../hooks/useComponent';

const styles = StyleSheet.create({
  container: { width: '100%' },
});

/**
 * Types with a live `<AdyenComponent>` mounted. A payment method type maps 1:1 to
 * a native controller, so mounting two components of the same type would fight
 * over the same controller — this registry rejects the duplicate.
 */
const activeComponentTypes = new Set<string>();

const duplicateTypeError = (type: string): string =>
  `An <AdyenComponent> with type "${type}" is already mounted. ` +
  `Only a single component per type may be mounted at a time.`;

/**
 * Props for {@link AdyenComponent}.
 */
export interface AdyenComponentProps {
  /**
   * The active {@link Checkout} returned by `setup()` / `setupAdvanced()`.
   * Required — its presence is compile-time proof that setup has completed.
   */
  checkout: Checkout;
  /** Payment method type to render (e.g. `"scheme"`, `"ideal"`, `"googlepay"`, `"applepay"`). */
  type: string;
}

/**
 * Generic embedded payment view. Renders the native payment component for the
 * given `type` and bridges its lifecycle to the shared checkout context: on
 * mount it subscribes the native view (keyed by its reactTag) to the
 * ComponentModule bus, and on unmount it unsubscribes and disposes the
 * controller. Replaces the former per-method card and platform-pay button
 * view components.
 */
export const AdyenComponent: React.FC<AdyenComponentProps> = ({
  checkout,
  type,
}) => {
  const { subscribe, unsubscribe, configuration } = useComponent();
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

  // Bridge the native view lifecycle to the ComponentModule bus by reactTag.
  useEffect(() => {
    const tag = findNodeHandle(nativeRef.current);
    if (tag == null) return;
    const viewId = String(tag);
    subscribe(viewId);
    return () => unsubscribe(viewId);
  }, [subscribe, unsubscribe]);

  // Defensive guard for untyped (JS) callers; TypeScript already requires `checkout`.
  if (!checkout) {
    throw new Error(
      'AdyenComponent requires a `checkout` obtained from setup()/setupAdvanced().'
    );
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
