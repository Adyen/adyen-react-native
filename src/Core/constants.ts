// @ts-check

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

/** Collection of events that components can trigger. */
export enum Event {
  /** Event handler, called when the shopper selects the Pay button and payment details are valid. */
  onSubmit = 'didSubmitCallback',
  /** Event handler, called when a payment method requires more details, for example for native 3D Secure 2, or native QR code payment methods. */
  onAdditionalDetails = 'didProvideCallback',
  /** Event handler, called when a shopper finishes the flow (Voucher payments only). */
  onComplete = 'didCompleteCallback',
  /** Event handler, called when payment about to be terminate. */
  onError = 'didFailCallback',
}

/** Collection of errors components can throw. */
export enum ErrorCode {
  /** Payment was canceled by shopper. */
  canceled = 'canceledByShopper',
  /** Payment method not supported on current platform. */
  notSupported = 'notSupported',
  /** Missing or invalid clientKey in configuration. */
  noClientKey = 'noClientKey',
  /** Missing or invalid amount or country code in configuration. */
  noPayment = 'noPayment',
  /** Can not parse paymentMethods or the list is empty. */
  invalidPaymentMethods = 'invalidPaymentMethods',
  /** Can not parse action. */
  invalidAction = 'invalidAction',
  /** This component does not support action handling. */
  notSupportedAction = 'notSupportedAction',
  /** Can not find selected payment method type in provided list. */
  noPaymentMethod = 'noPaymentMethod',
}

/** Collection of available environments. */
export enum Environment {
  test = 'test',
  europe = 'live-eu',
  us = 'live-us',
  australia = 'live-au',
  asiaPacificSouthEast = 'live-apse',
  india = 'live-in',
}

/** Collection of available result codes that represent payments current state, as well as any actions you should take. */
export enum ResultCode {
  /** The payment has been successfully authenticated with 3D Secure. */
  authenticationFinished = 'AuthenticationFinished',
  /** The transaction does not require 3D Secure authentication, for example, the issuing bank does not require authentication or the transaction is out of scope. */
  authenticationNotRequired = 'AuthenticationNotRequired',
  /** The payment was successfully authorised. */
  authorised = 'Authorised',
  /** The payment was cancelled (by either the shopper or your own system) before processing was completed. */
  cancelled = 'Cancelled',
  /** The issuer requires further shopper interaction before the payment can be authenticated. Returned for 3D Secure 2 transactions. */
  challengeShopper = 'ChallengeShopper',
  /** There was an error when the payment was being processed. You'll receive a refusalReason in the same response, indicating the cause of the error. */
  error = 'Error',
  /** The issuer requires the shopper's device fingerprint before the payment can be authenticated. Returned for 3D Secure 2 transactions. */
  identifyShopper = 'IdentifyShopper',
  /** It's not possible to obtain the final status of the payment at this time. This is common for payments with an asynchronous flow, such as Boleto or iDEAL. */
  pending = 'Pending',
  /** Present the voucher or the QR code to the shopper. */
  presentToShopper = 'PresentToShopper',
  /** This is part of the standard payment flow for methods such as SEPA Direct Debit, where it can take some time before the final status of the payment is known. */
  received = 'Received',
  /** The shopper needs to be redirected to an external web page or app to complete the payment. */
  redirectShopper = 'RedirectShopper',
  /** The payment was refused. You'll receive a `refusalReason` in the same response that indicates why it was refused. */
  refused = 'Refused',
}
