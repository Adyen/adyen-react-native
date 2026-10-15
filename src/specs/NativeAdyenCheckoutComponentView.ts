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
} from 'react-native/Libraries/Types/CodegenTypes';

export type LayoutChangeEvent = {
  width: Int32;
  height: Int32;
};

/**
 * Fabric registration surface for an embedded payment-method controller.
 *
 * The view binds to an existing native controller by its opaque checkout and controller
 * identities. It never creates or disposes the controller, and checkout configuration
 * deliberately does not cross Fabric.
 */
export interface NativeProps extends ViewProps {
  checkoutId: string;
  controllerId: string;
  onLayoutChange?: DirectEventHandler<LayoutChangeEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'AdyenCheckoutComponentView'
);
