import { NativeModule, NativeModules } from 'react-native';
import { AdyenActionComponent } from '../core/AdyenNativeModules';
import { ModuleMock } from '../modules/ModuleMock';

/** Generic Redirect component */
export const AdyenInstant: AdyenActionComponent & NativeModule = NativeModules.AdyenInstant ?? ModuleMock;
