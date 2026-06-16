import type { TurboModule } from 'react-native';
import type { Card } from './types';
import type { AdyenCSEModule } from './AdyenCSEModule';

/** Native module interface specific to CSE */
interface CSENativeModule extends TurboModule, AdyenCSEModule {}

export class AdyenCSEWrapper implements AdyenCSEModule {
  private readonly nativeModule: CSENativeModule;

  constructor(nativeModule: CSENativeModule) {
    this.nativeModule = nativeModule;
  }

  /** Method to encrypt card. */
  encryptCard(payload: Card, publicKey: string): Promise<Card> {
    return this.nativeModule.encryptCard(payload, publicKey);
  }

  /** Method to encrypt BIN(first 6-11 digits of the card). */
  encryptBin(payload: string, publicKey: string): Promise<string> {
    return this.nativeModule.encryptBin(payload, publicKey);
  }

  /** Method to validate card number. */
  validateCardNumber(
    cardNumber: string,
    enableLuhnCheck: boolean
  ): Promise<boolean> {
    return this.nativeModule.validateCardNumber(cardNumber, enableLuhnCheck);
  }

  /** Method to validate card expiry date. */
  validateCardExpiryDate(
    expiryMonth: string,
    expiryYear: string
  ): Promise<boolean> {
    return this.nativeModule.validateCardExpiryDate(expiryMonth, expiryYear);
  }

  /** Method to validate card security code. */
  validateCardSecurityCode(
    securityCode: string,
    cardBrand?: string
  ): Promise<boolean> {
    return this.nativeModule.validateCardSecurityCode(securityCode, cardBrand);
  }
}
