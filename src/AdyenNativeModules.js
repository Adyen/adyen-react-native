// @ts-check

import { NativeModules } from 'react-native';
import { find, NATIVE_COMPONENTS } from './ComponentMap';
import { LINKING_ERROR, UNKNOWN_PAYMENT_METHOD_ERROR } from './constants';

/**
 * @typedef {Object} PaymentMethod
 * @property {string} type The unique payment method code.
 * @property {string} name The displayable name of this payment method.
 */

/**
 * JSON response from Adyen API `\paymentMethods`.
 * @typedef {Object} PaymentMethodsResponse
 * @property {any[]=} storedPaymentMethods List of all stored payment methods.
 * @property {PaymentMethod[]} paymentMethods Detailed list of payment methods required to generate payment forms.
 */

/**
 * Generic Native component
 * @typedef {Object} AdyenComponent
 * @property {(paymentMethods: PaymentMethodsResponse, configuration: any) => void} open Show component above current screen.
 * @property {(success: boolean, message: (string | undefined)) => void} hide Dismiss component from screen.
 */
/**
 * DropIn Component
 * @typedef {Object} AdyenDropIn
 * @property {(action: any) => void} handle Handles action from Adyen API `\payments` response.
 */
/** @type {AdyenDropIn & AdyenComponent} */
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
 * @typedef {Object} AdyenInstant Generic Redirect component
 * @property {(action: any) => void} handle Handles action from Adyen API `\payments` response.
 */
/** @type {AdyenInstant & AdyenComponent} */
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

/** @typedef {AdyenComponent} AdyenApplePay Apple Pay component (only available for iOS) */
/** @type {AdyenApplePay} */
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

/** @typedef {AdyenComponent} AdyenGooglePay Google Pay component (only available for Android) */
/** @type {AdyenGooglePay} */
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

export function getNativeComponent(name, paymentMethods) {
  const type = name.toLowerCase();
  switch (type) {
    case 'dropin':
    case 'drop-in':
    case 'adyendropin':
      return { nativeComponent: AdyenDropIn };
    case 'applepay':
      return { nativeComponent: AdyenApplePay };
    case 'paywithgoogle':
    case 'googlepay':
      return { nativeComponent: AdyenGooglePay };
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
