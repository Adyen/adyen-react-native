// @ts-check

import { NativeModules } from 'react-native';
import { find, NATIVE_COMPONENTS } from './ComponentMap';
import { LINKING_ERROR, UNKNOWN_PAYMENT_METHOD_ERROR } from './constants';

/**
 * @typedef {Object} PaymentMethod
 * @property {string} type - The unique payment method code.
 * @property {string} name - The displayable name of this payment method.
 *
 * @typedef {Object} PaymentMethodsResponse
 * @property {[PaymentMethod & {id: string}]=} storedPaymentMethods - List of all stored payment methods.
 * @property {[PaymentMethod]} paymentMethods - Detailed list of payment methods required to generate payment forms.
 */
/**
 * @callback HandleActionFunction
 * @param { {type: string}} action - JSON response from Adyen API `\payments`
 * @returns {void}
 */
/**
 * @callback HideFunction
 * @param {boolean} success - is payment successfull
 * @param {string=} message - alert pop message to show after DropIn is compleated
 * @returns {void}
 */
/**
 * @callback OpenFunction
 * @param {PaymentMethodsResponse} paymentMethods - JSON response from Adyen API `\paymentMethods`
 * @param {any} configuration - collection of all nececery configurations
 * @returns {void}
 */
/**
 * @typedef {Object} AdyenComponent - DropIn Component
 * @property {OpenFunction} open
 * @property {HideFunction} hide
 */
/**
 * @typedef {Object} AdyenDropIn - DropIn Component
 * @property {HandleActionFunction} handle - component handles action
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
 * @typedef {Object} AdyenInstant - Generic Redirect component
 * @property {HandleActionFunction} handle
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

/**
 * @typedef {AdyenComponent} AdyenApplePay - Apple Pay component (only availalbe for iOS)
 */
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

/**
 * @typedef {AdyenComponent} AdyenGooglePay - Google Pay component (only availalbe for Android)
 */
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
 * @property {string} number
 * @property {string} expiryMonth
 * @property {string} expiryYear
 * @property {string} cvv
 *
 * @callback EncryptCardFunction
 * @param {Card} payload - unencrypted card object
 * @param {string} publicKey - Public key fro encryption. Could be obtained for your ws_user in Customer Area.
 * @returns {Promise<Card>}
 */
/**
 * @callback EncryptBINFunction
 * @param {string} binValue - unencrypted BIN value (first 6-11 digits of the card).
 * @param {string} publicKey - Public key fro encryption. Could be obtained for your ws_user in Customer Area.
 * @returns {Promise<String>}
 */
/**
 * @typedef {Object} AdyenCSE - Generic Redirect component
 * @property {EncryptCardFunction} encryptCard
 * @property {EncryptBINFunction} encryptBin
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

  let paymentMethod = find(paymentMethods, type);
  if (!paymentMethod) {
    throw new Error(UNKNOWN_PAYMENT_METHOD_ERROR + name);
  }

  if (NATIVE_COMPONENTS.includes(type)) {
    return { nativeComponent: AdyenDropIn, paymentMethod: paymentMethod };
  }

  return { nativeComponent: AdyenInstant, paymentMethod: paymentMethod };
}
