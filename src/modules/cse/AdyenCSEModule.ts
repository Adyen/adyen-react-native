import { NativeModules } from 'react-native';
import { ModuleMock } from '../base/ModuleMock';
import { AdyenCSEWrapper } from './AdyenCSEModuleWrapper';
import type { Card } from './types';

/** Describes a native module capable of encrypting card data. */
export interface AdyenCSEModule {
  /** Method to encrypt card. */
  encryptCard(payload: Card, publicKey: string): Promise<Card>;

  /** Method to encrypt BIN(first 6-11 digits of the card). */
  encryptBin(payload: string, publicKey: string): Promise<string>;

  /** Method to validate card number. */
  validateCardNumber(
    cardNumber: string,
    enableLuhnCheck: boolean
  ): Promise<boolean>;

  /** Method to validate card expiry date. */
  validateCardExpiryDate(
    expiryMonth: string,
    expiryYear: string
  ): Promise<boolean>;

  /** Method to validate card security code. */
  validateCardSecurityCode(
    securityCode: string,
    cardBrand?: string
  ): Promise<boolean>;
}

/** Encryption helper. */
export const AdyenCSE: AdyenCSEModule = new AdyenCSEWrapper(
  NativeModules.AdyenCSE ?? ModuleMock
);
