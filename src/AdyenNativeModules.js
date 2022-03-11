import { NativeModules } from 'react-native';

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

export const AdyenCardComponent = NativeModules.AdyenCardComponent
  ? NativeModules.AdyenCardComponent
  : new Proxy(
      {},
      { get() { throw new Error(LINKING_ERROR); }, }
    );

export function getNativeComponent(name) {
  switch (name) {
    case 'AdyenCardComponent':
      return AdyenCardComponent;
    default:
      return AdyenDropIn;
  }
}
