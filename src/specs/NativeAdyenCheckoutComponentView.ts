//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  Int32,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';

export type CheckoutTargetKind = 'paymentMethod' | 'storedPaymentMethod';

export type LayoutChangeEvent = {
  width: Int32;
  height: Int32;
};

/**
 * Fabric registration surface for an embedded checkout presenter.
 *
 * Every registration is bound to opaque internal checkout and presenter identities. `targetValue`
 * carries a payment-method type or stored-method ID according to `targetKind`; checkout
 * configuration deliberately does not cross Fabric.
 */
export interface NativeProps extends ViewProps {
  checkoutId: string;
  presenterId: string;
  targetKind?: WithDefault<CheckoutTargetKind, 'paymentMethod'>;
  targetValue: string;
  onLayoutChange?: DirectEventHandler<LayoutChangeEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'AdyenCheckoutComponentView'
);
