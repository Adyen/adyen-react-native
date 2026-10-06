import type { Card } from './types';
import type { AdyenCSEModule } from './AdyenCSEModule';
import type { Spec as CSENativeModule } from '../../specs/NativeAdyenCSE';

export class AdyenCSEWrapper implements AdyenCSEModule {
  private readonly nativeModule: CSENativeModule;

  constructor(nativeModule: CSENativeModule) {
    this.nativeModule = nativeModule;
  }

  /** Method to encrypt card. */
  async encryptCard(payload: Card, publicKey: string): Promise<Card> {
    const encryptedCard = await this.nativeModule.encryptCard(
      JSON.stringify(payload),
      publicKey
    );
    return JSON.parse(encryptedCard) as Card;
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
