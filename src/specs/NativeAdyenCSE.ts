//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

/**
 * Generated CSE surface.
 *
 * Card input/output is serialized so the native SDK can evolve its encrypted-card representation
 * without exposing an unchecked bridge object. CSE has no checkout or operation identity.
 */
export interface Spec extends TurboModule {
  encryptCard(cardJson: string, publicKey: string): Promise<string>;
  encryptBin(bin: string, publicKey: string): Promise<string>;
  validateCardNumber(
    cardNumber: string,
    enableLuhnCheck: boolean
  ): Promise<boolean>;
  validateCardExpiryDate(
    expiryMonth: string,
    expiryYear: string
  ): Promise<boolean>;
  validateCardSecurityCode(
    securityCode: string,
    cardBrand?: string
  ): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AdyenCSE');
