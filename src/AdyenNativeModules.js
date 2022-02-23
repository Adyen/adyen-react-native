import { NativeModules } from 'react-native';

export default { AdyenDropIn, AdyenCardComponent } = NativeModules;

export function getNativeComponent(name) {
  switch (name) {
    case 'AdyenCardComponent':
      return AdyenCardComponent;
    default:
      return AdyenDropIn;
  }
}
