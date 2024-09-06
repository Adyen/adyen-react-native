import { NativeModule, NativeModules } from 'react-native';
import { AdyenActionComponent } from '../core/AdyenNativeModules';
import { ModuleMock } from '../modules/ModuleMock';

/** Google Pay component (only available for Android) */
export const AdyenGooglePay: AdyenActionComponent & NativeModule = NativeModules.AdyenGooglePay ?? ModuleMock;
