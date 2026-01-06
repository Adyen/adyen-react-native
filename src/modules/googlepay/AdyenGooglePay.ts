import { NativeModules } from 'react-native';
import type {
  AdyenActionComponent,
  ConditionalPaymentComponent,
} from '../../core';
import { ModuleMock } from '../base/ModuleMock';
import { GooglePayWrapper } from './GooglePayWrapper';

export interface GooglePayModule
  extends ConditionalPaymentComponent, AdyenActionComponent {}

/** Google Pay component (only available for Android) */
export const AdyenGooglePay: GooglePayModule = new GooglePayWrapper(
  NativeModules.AdyenGooglePay ?? ModuleMock
);
