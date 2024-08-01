import { NativeModule, NativeModules } from 'react-native';
import { LINKING_ERROR } from '../core/constants';
import { AdyenComponent } from '../core/AdyenNativeModules';
import { AdyenActionComponent } from "../core/AdyenNativeModules";

export const ModuleMock = new Proxy(
  {},
  {
    get() {
      throw new Error(LINKING_ERROR);
    },
  }
);

/** Generic Redirect component */
export const AdyenInstant: AdyenActionComponent & NativeModule = NativeModules.AdyenInstant ?? ModuleMock;

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: AdyenComponent & NativeModule = NativeModules.AdyenApplePay ?? ModuleMock;

/** Google Pay component (only available for Android) */
export const AdyenGooglePay: AdyenActionComponent & NativeModule = NativeModules.AdyenGooglePay ?? ModuleMock;

