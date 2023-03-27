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

export const ADDRESS_SCHEMA = ['street', 'houseNumberOrName', 'postalCode', 'city', 'stateOrProvince', 'country'] as const;
export const [STREET, HOUSE_NUMBER_OR_NAME, POSTAL_CODE, CITY, STATE_OR_PROVINCE, COUNTRY] = ADDRESS_SCHEMA;

export type FieldsetVisibility = ['full', 'postalCode', 'hidden'];

/** Collection of events that components can trigger. */
export const Event = Object.freeze({
  /** Event handler, called when the shopper selects the Pay button and payment details are valid. */
  onSubmit: 'didSubmitCallback',
  /** Event handler, called when a payment method requires more details, for example for native 3D Secure 2, or native QR code payment methods. */
  onAdditionalDetails: 'didProvideCallback',
  /** Event handler, called when a shopper finishes the flow (Voucher payments only). */
  onComplete: 'didCompleteCallback',
  /** Event handler, called when payment about to be terminate. */
  onError: 'didFailCallback',
});

/** Collection of errors components can throw. */
export const ErrorCode = Object.freeze({
  /** Payment was canceled by shopper. */
  Canceled: 'canceledByShopper',
  /** Payment method not supported on current platform. */
  NotSupported: 'notSupported',
  /** Missing or invalid clientKey in configuration. */
  NoClientKey: 'noClientKey',
  /** Missing or invalid amount or country code in configuration. */
  NoPayment: 'noPayment',
  /** Can not parse paymentMethods or the list is empty. */
  InvalidPaymentMethods: 'invalidPaymentMethods',
  /** Can not parse action. */
  InvalidAction: 'invalidAction',
  /** Can not find selected payment method type in provided list. */
  NoPaymentMethod: 'noPaymentMethod',
});

/** Collection of available environments. */
export const Environment = Object.freeze({
  Test: 'test',
  Europe: 'live-eu',
  US: 'live-us',
  Australia: 'live-au',
  AsiaPacificSouthEast: 'live-apse',
  India: 'live-in',
});

/** Collection of available result codes that represent payments current state, as well as any actions you should take. */
export const ResultCode = Object.freeze({
  /** The payment has been successfully authenticated with 3D Secure. */
  AuthenticationFinished: 'AuthenticationFinished',
  /** The transaction does not require 3D Secure authentication, for example, the issuing bank does not require authentication or the transaction is out of scope. */
  AuthenticationNotRequired: 'AuthenticationNotRequired',
  /** The payment was successfully authorised. */
  Authorised: 'Authorised',
  /** The payment was cancelled (by either the shopper or your own system) before processing was completed. */
  Cancelled: 'Cancelled',
  /** The issuer requires further shopper interaction before the payment can be authenticated. Returned for 3D Secure 2 transactions. */
  ChallengeShopper: 'ChallengeShopper',
  /** There was an error when the payment was being processed. You'll receive a refusalReason in the same response, indicating the cause of the error. */
  Error: 'Error',
  /** The issuer requires the shopper's device fingerprint before the payment can be authenticated. Returned for 3D Secure 2 transactions. */
  IdentifyShopper: 'IdentifyShopper',
  /** It's not possible to obtain the final status of the payment at this time. This is common for payments with an asynchronous flow, such as Boleto or iDEAL. */
  Pending: 'Pending',
  /** Present the voucher or the QR code to the shopper. */
  PresentToShopper: 'PresentToShopper',
  /** This is part of the standard payment flow for methods such as SEPA Direct Debit, where it can take some time before the final status of the payment is known. */
  Received: 'Received',
  /** The shopper needs to be redirected to an external web page or app to complete the payment. */
  RedirectShopper: 'RedirectShopper',
  /** The payment was refused. You'll receive a `refusalReason` in the same response that indicates why it was refused. */
  Refused: 'Refused',
});
