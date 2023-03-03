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

export const Event = Object.freeze({
  OnSubmit: Symbol('didSubmitCallback'),
  OnProvide: Symbol('didProvideCallback'),
  OnCompleated: Symbol('didCompleteCallback'),
  OnFailed: Symbol('didFailCallback'),
});

export const ErrorCode = Object.freeze({
  Canceled: Symbol('canceledByShopper'),
  NotSupported: Symbol('notSupported'),
  NoClientKey: Symbol('noClientKey'),
  NoPayment: Symbol('noPayment'),
  InvalidPaymentMethods: Symbol('invalidPaymentMethods'),
  InvalidAction: Symbol('invalidAction'),
  NoPaymentMethod: Symbol('Symbol(noPaymentMethod'),
});

export const Environment = Object.freeze({
  Test: Symbol('test'),
  Europe: Symbol('live'),
  US: Symbol('live-us'),
  Australia: Symbol('live-au'),
  AsiaPacificSouthEast: Symbol('live-apse'),
});
