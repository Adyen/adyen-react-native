import { Platform } from 'react-native';

export const UNKNOWN_PAYMENT_METHOD_ERROR =
  'Unknown payment method or native module. \n\n' +
  'Make sure your paymentMethods response contains: ';

export const UNSUPPORTED_PAYMENT_METHOD_ERROR = 'Unsupported payment method: ';

export const LINKING_ERROR =
  `The package '@adyen/react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';
