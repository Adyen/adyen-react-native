//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

/**
 * Generated standalone Action surface.
 *
 * Action and configuration objects are serialized at the bridge boundary. The native module owns
 * its operation identity so standalone actions cannot share or expose checkout state.
 */
export interface Spec extends TurboModule {
  handle(actionJson: string, configurationJson: string): Promise<string>;
  hide(): Promise<void>;
  getThreeDS2SdkVersion(): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AdyenAction');
