import { NativeModules } from 'react-native';
import { find, NATIVE_COMPONENTS } from './ComponentMap';

const UNKNOWN_PAYMENT_METHOD_ERROR = 
  'Unknown payment method or native module. \n\n' + 
  'Make sure your paymentMethods response contains: ';

const LINKING_ERROR =
  `The package '@adyen/react-native' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

export const AdyenDropIn = NativeModules.AdyenDropIn
  ? NativeModules.AdyenDropIn
  : new Proxy(
      {},
      { get() { throw new Error(LINKING_ERROR); }, }
    );

export const AdyenInstant = NativeModules.AdyenInstant
  ? NativeModules.AdyenInstant
  : new Proxy(
      {},
      { get() { throw new Error(LINKING_ERROR); }, }
    );

export const AdyenCardComponent = NativeModules.AdyenCardComponent
  ? NativeModules.AdyenCardComponent
  : new Proxy(
      {},
      { get() { throw new Error(LINKING_ERROR); }, }
    );

export function getNativeComponent(name, paymentMethods) {
  const type = name.toLowerCase();
  switch (type) {
    case 'dropin':
    case 'adyendropin':
      return { nativeComponent: AdyenDropIn };
    case 'AdyenCardComponent':
      return { nativeComponent: AdyenCardComponent };
    default:
      break;
  }

  let paymentMethod = find(paymentMethods, type)
  if (!paymentMethod) {
    throw new Error(UNKNOWN_PAYMENT_METHOD_ERROR + name);
  }

  if (NATIVE_COMPONENTS.includes(type)) {
    return { nativeComponent: AdyenDropIn, paymentMethod: paymentMethod };
  }

  return { nativeComponent: AdyenInstant, paymentMethod: paymentMethod };
}

