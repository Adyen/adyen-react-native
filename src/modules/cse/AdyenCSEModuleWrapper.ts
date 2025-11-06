import type { NativeModule } from 'react-native';
import type { Card } from '../../core/types';
import type { AdyenCSEModule } from './AdyenCSEModule';

export class AdyenCSEModuleWrapper implements AdyenCSEModule {
  nativeModule: NativeModule | any;

  constructor(nativeModule: NativeModule | any) {
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
