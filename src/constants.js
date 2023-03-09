// @ts-check

export const PAYMENT_SUBMIT_EVENT = 'didSubmitCallback';
export const PAYMENT_PROVIDE_DETAILS_EVENT = 'didProvideCallback';
export const PAYMENT_COMPLETED_EVENT = 'didCompleteCallback';
export const PAYMENT_FAILED_EVENT = 'didFailCallback';

export const ERROR_CODE_CANCELED = 'canceledByShopper';
export const ERROR_CODE_NOT_SUPPORTED = 'notSupported';
export const ERROR_CODE_NO_CLIENT_KEY = 'noClientKey';
export const ERROR_CODE_NO_PAYMENT = 'noPayment';
export const ERROR_CODE_INVALID_PAYMENT_METHODS = 'invalidPaymentMethods';
export const ERROR_CODE_INVALID_ACTION = 'invalidAction';
export const ERROR_CODE_NO_PAYMENT_METHOD = 'noPaymentMethod';

export const UNKNOWN_PAYMENT_METHOD_ERROR =
  'Unknown payment method or native module. \n\n' +
  'Make sure your paymentMethods response contains: ';

export const LINKING_ERROR =
  `The package '@adyen/react-native' doesn't seem to be linked. Make sure: \n\n` +
  // @ts-ignore
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

export const MISSING_CONTEXT_ERROR =
  'useAdyenCheckout must be used within a AdyenCheckout';

/**
 * Collection of events that components can trigger.
 * @typedef {Object} Event
 * @property {string} onSubmit Event handler, called when the shopper selects the Pay button and payment details are valid.
 * @property {string} onAdditionalDetails Event handler, called when a payment method requires more details, for example for native 3D Secure 2, or native QR code payment methods.
 * @property {string} onComplete Event handler, called when a shopper finishes the flow (Voucher payments only).
 * @property {string} onError Event handler, called when payment about to be terminate.
 */

/**  @type {Event} */
export const Event = Object.freeze({
  onSubmit: 'didSubmitCallback',
  onAdditionalDetails: 'didProvideCallback',
  onComplete: 'didCompleteCallback',
  onError: 'didFailCallback',
});

/**
 * Collection of errors components can throw.
 * @typedef {Object} ErrorCode
 * @property {string} Canceled Payment was canceled by shopper.
 * @property {string} NotSupported Payment method not supported on current platform..
 * @property {string} NoClientKey Missing or invalid clientKey in configuration.
 * @property {string} NoPayment Missing or invalid amount or country code in configuration.
 * @property {string} InvalidPaymentMethods Can not parse paymentMethods or the list is empty.
 * @property {string} InvalidAction Can not parse action.
 * @property {string} NoPaymentMethod Can not find selected payment method type in provided list.
 */

/** @type {ErrorCode} */
export const ErrorCode = Object.freeze({
  Canceled: 'canceledByShopper',
  NotSupported: 'notSupported',
  NoClientKey: 'noClientKey',
  NoPayment: 'noPayment',
  InvalidPaymentMethods: 'invalidPaymentMethods',
  InvalidAction: 'invalidAction',
  NoPaymentMethod: 'Symbol(noPaymentMethod',
});

/**
 * Collection of available environments.
 * @typedef {Object} Environment
 * @property {string} Test
 * @property {string} Europe
 * @property {string} US
 * @property {string} Australia
 * @property {string} AsiaPacificSouthEast
 * @property {string} India
 */

/** @type {Environment} */
export const Environment = Object.freeze({
  Test: 'test',
  Europe: 'live-eu',
  US: 'live-us',
  Australia: 'live-au',
  AsiaPacificSouthEast: 'live-apse',
  India: 'live-in',
});
