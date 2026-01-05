import type { NativeModule } from 'react-native';
import type { Card } from '../../core/types';
import type { AdyenCSEModule } from './AdyenCSEModule';

/** Native module interface specific to CSE */
export interface CSENativeModule extends NativeModule {
  encryptCard(payload: Card, publicKey: string): Promise<Card>;
  encryptBin(payload: string, publicKey: string): Promise<string>;
}

export class AdyenCSEWrapper implements AdyenCSEModule {
  private nativeModule: CSENativeModule;

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
}
