import { NativeModule, NativeModules } from 'react-native';
import { Card } from '../core/types';
import { ModuleMock } from './ModuleMock';

/** Describes a native module capable of encrypting card data. */

export interface AdyenCSEModule extends NativeModule {
  /** Method to encrypt card. */
  encryptCard: (payload: Card, publicKey: string) => Promise<Card>;

  /** Method to encrypt BIN(first 6-11 digits of the card). */
  encryptBin: (payload: string, publicKey: string) => Promise<string>;
}

/**Encryption helper. */
export const AdyenCSE: AdyenCSEModule = NativeModules.AdyenCSE ?? ModuleMock;
