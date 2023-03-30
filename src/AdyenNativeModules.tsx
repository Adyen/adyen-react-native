// @ts-check

import { NativeModule, NativeModules } from 'react-native';
import { find, NATIVE_COMPONENTS } from './ComponentMap';
import {
  ErrorCode,
  LINKING_ERROR,
  UNKNOWN_PAYMENT_METHOD_ERROR,
} from './Core/constants';
import { Card, PaymentAction, PaymentMethod, PaymentMethodsResponse } from './Core/types';

/** Universal interface for Adyen Native payment component */
interface AdyenComponent {
  /** Show component above current screen. */
  open: (paymentMethods: PaymentMethodsResponse, configuration: any) => void;

  /** Dismiss component from screen. */
  hide: (success: boolean, message: (string | undefined)) => void;
}

/** Describes Adyen Component capable of handling action */
export interface AdyenActionComponent extends AdyenComponent {
  handle: (action: PaymentAction) => void;
}

/**
 * @private
 *  Wrapper for all Native Modules that do not support Action handling.
 * */
class AdyenNativeComponentWrapper implements AdyenActionComponent {
  nativeModule: NativeModule | any;
  constructor(nativeModule: NativeModule) {
    this.nativeModule = nativeModule;
  }

  addListener(eventType: string) {
    this.nativeModule.addListener(eventType);
  }
  removeListeners(count: number) {
    this.nativeModule.removeListeners(count);
  }
  handle(action: PaymentAction) {
    throw Error(ErrorCode.notSupportedAction);
  }
  open(paymentMethods: PaymentMethodsResponse, configuration: any) {
    this.nativeModule.open(paymentMethods, configuration);
  }
  hide(success: boolean, message: string | undefined) {
    this.nativeModule.hide(success, message);
  }
}

/** Drop-in is our pre-built UI solution for accepting payments. Drop-in shows all payment methods as a list and handles actions. */
export const AdyenDropIn: AdyenActionComponent & NativeModule = NativeModules.AdyenDropIn
  ? NativeModules.AdyenDropIn
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/** Generic Redirect component */
export const AdyenInstant: AdyenActionComponent & NativeModule = NativeModules.AdyenInstant
  ? NativeModules.AdyenInstant
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: AdyenComponent & NativeModule = NativeModules.AdyenApplePay
  ? NativeModules.AdyenApplePay
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/** Google Pay component (only available for Android) */
export const AdyenGooglePay: AdyenComponent & NativeModule = NativeModules.AdyenGooglePay
  ? NativeModules.AdyenGooglePay
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/** Describes Adyen Component capable of handling action */
interface AdyenCSE extends NativeModule {
  /** Method to encrypt card. */ 
  encryptCard: (payload: Card, publicKey: string) => Promise<Card>;

  /** Method to encrypt BIN(first 6-11 digits of the card). */
  encryptBin: (payload: string, publicKey: string) => Promise<string>;
}

/**Encryption helper. */
export const AdyenCSE: AdyenCSE = NativeModules.AdyenCSE
  ? NativeModules.AdyenCSE
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/** 
 * Get native component capable of handling provided payment method type. 
 */
export function getNativeComponent(typeName: string, paymentMethods: PaymentMethodsResponse): { nativeComponent: AdyenActionComponent & NativeModule; paymentMethod: PaymentMethod | undefined; } {
  const type = typeName.toLowerCase();
  switch (type) {
    case 'dropin':
    case 'drop-in':
    case 'adyendropin':
      return { nativeComponent: AdyenDropIn, paymentMethod: undefined };
    case 'applepay':
      return {
        nativeComponent: new AdyenNativeComponentWrapper(AdyenApplePay),
        paymentMethod: undefined,
      };
    case 'paywithgoogle':
    case 'googlepay':
      return {
        nativeComponent: new AdyenNativeComponentWrapper(AdyenGooglePay),
        paymentMethod: undefined,
      };
    default:
      break;
  }

  const paymentMethod = find(paymentMethods, type);
  if (!paymentMethod) {
    throw new Error(UNKNOWN_PAYMENT_METHOD_ERROR + typeName);
  }

  if (NATIVE_COMPONENTS.includes(type)) {
    return { nativeComponent: AdyenDropIn, paymentMethod: paymentMethod };
  }

  return { nativeComponent: AdyenInstant, paymentMethod: paymentMethod };
}
