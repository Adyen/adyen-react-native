// @ts-check

import { NativeModules } from 'react-native';
import { find, NATIVE_COMPONENTS } from './ComponentMap';
import {
  ErrorCode,
  LINKING_ERROR,
  UNKNOWN_PAYMENT_METHOD_ERROR,
} from './constants';

/**
 * @typedef {Object} PaymentMethod
 * @property {string} type The unique payment method code.
 * @property {string} name The displayable name of this payment method.
 */

/**
 * JSON response from Adyen API `\paymentMethods`
 * @typedef {Object} PaymentMethodsResponse
 * @property {any[]=} storedPaymentMethods List of all stored payment methods.
 * @property {PaymentMethod[]} paymentMethods Detailed list of payment methods required to generate payment forms.
 */

/**
 * Describes Adyen Component
 * @typedef {Object} AdyenComponent
 * @property {(paymentMethods: PaymentMethodsResponse, configuration: any) => void} open Show component above current screen.
 * @property {(success: boolean, message: (string | undefined)) => void} hide Dismiss component from screen.
 */

/**
 * Describes Adyen Component capable of handling action
 * @typedef {Object} AdyenActionComponent
 * @property {(action: any) => void} handle Handles action from Adyen API `\payments` response.
 */

/**
 * Universal interface for Adyen Native payment component
 * @typedef {import('react-native').NativeModule & AdyenActionComponent & AdyenComponent} AdyenNativeComponent
 */

/**
 * @private
 * @type {AdyenNativeComponent} Wrapper for all Native Modules
 * */
class AdyenNativeComponentWrapper {
  /**
   * @param {import('react-native').NativeModule & AdyenComponent} nativeModule
   */
  constructor(nativeModule) {
    this.nativeModule = nativeModule;
  }

  /** @param {string} eventType */
  addListener(eventType) {
    this.nativeModule.addListener(eventType);
  }
  /**  @param {number} count  */
  removeListeners(count) {
    this.nativeModule.removeListeners(count);
  }
  /** @param {any} action */
  handle(action) {
    throw Error(ErrorCode.InvalidAction);
  }
  /**
   * @param {PaymentMethodsResponse} paymentMethods
   * @param {any} configuration
   */
  open(paymentMethods, configuration) {
    this.nativeModule.open(paymentMethods, configuration);
  }
  /**
   * @param {boolean} success
   * @param {string | undefined} message
   */
  hide(success, message) {
    this.nativeModule.hide(success, message);
  }
}

/** @type {AdyenNativeComponent} */
export const AdyenDropIn = NativeModules.AdyenDropIn
  ? NativeModules.AdyenDropIn
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Generic Redirect component
 * @type {AdyenNativeComponent}
 * */
export const AdyenInstant = NativeModules.AdyenInstant
  ? NativeModules.AdyenInstant
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Apple Pay component (only available for iOS)
 * @type {import('react-native').NativeModule & AdyenComponent}
 * */
export const AdyenApplePay = NativeModules.AdyenApplePay
  ? NativeModules.AdyenApplePay
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Google Pay component (only available for Android)
 * @type {import('react-native').NativeModule & AdyenComponent}
 * */
export const AdyenGooglePay = NativeModules.AdyenGooglePay
  ? NativeModules.AdyenGooglePay
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * @typedef {Object} Card
 * @property {string} number PAN of card.
 * @property {string} expiryMonth Month in format MM.
 * @property {string} expiryYear Year in format YYYY.
 * @property {string} cvv 3 or 4 digits.
 *
 */
/**
 * @typedef {Object} AdyenCSE Encryption helper.
 * @property {(payload: Card, publicKey: string) => Promise<Card>} encryptCard Method to encrypt card.
 * @property {(payload: string, publicKey: string) => Promise<string>} encryptBin Method to encrypt BIN(first 6-11 digits of the card).
 */
/** @type {AdyenCSE} */
export const AdyenCSE = NativeModules.AdyenCSE
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
 * @param {string} name Payment method type
 * @param {PaymentMethodsResponse} paymentMethods
 * @returns { {nativeComponent: AdyenNativeComponent, paymentMethod: PaymentMethod | undefined }} native component
 */
export function getNativeComponent(name, paymentMethods) {
  const type = name.toLowerCase();
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
    throw new Error(UNKNOWN_PAYMENT_METHOD_ERROR + name);
  }

  if (NATIVE_COMPONENTS.includes(type)) {
    return { nativeComponent: AdyenDropIn, paymentMethod: paymentMethod };
  }

  return { nativeComponent: AdyenInstant, paymentMethod: paymentMethod };
}
