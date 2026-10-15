//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import NativeAdyenCheckoutComponentView, {
  type LayoutChangeEvent,
} from '../specs/NativeAdyenCheckoutComponentView';
import type { Controller } from '../core';
import { controllerHandleFor } from '../checkout/createController';

const styles = StyleSheet.create({
  container: { width: '100%' },
});

/** Props for {@link AdyenComponent}. */
export interface AdyenComponentProps extends ViewProps {
  /** The controller whose payment UI is displayed. */
  controller: Controller;
}

/**
 * Embedded payment view for a controller that requires user interaction.
 *
 * The view displays the controller's existing native component; mounting and unmounting it
 * neither creates nor disposes the controller. Renders nothing for a controller that has no UI
 * (`requiresUserInteraction` is `false`) or that did not originate from a checkout.
 */
export const AdyenComponent: React.FC<AdyenComponentProps> = ({
  controller,
  style,
  ...viewProps
}) => {
  const nativeRef = useRef(null);
  const [size, setSize] = useState<LayoutChangeEvent>();
  const handle = controllerHandleFor(controller);

  const handleLayoutChange = useCallback(
    (event: { nativeEvent: LayoutChangeEvent }) => setSize(event.nativeEvent),
    []
  );

  if (!handle || !controller.requiresUserInteraction) {
    return null;
  }

  return (
    <NativeAdyenCheckoutComponentView
      {...viewProps}
      ref={nativeRef}
      checkoutId={handle.checkoutId}
      controllerId={handle.controllerId}
      onLayoutChange={handleLayoutChange}
      style={[styles.container, style, { height: size?.height }]}
    />
  );
};
