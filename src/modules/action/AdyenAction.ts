import { NativeModules } from 'react-native';
import type {
  BaseConfiguration,
  PaymentAction,
  PaymentDetailsData,
} from '../../core';
import { ModuleMock } from '../base/ModuleMock';
import { ActionModuleWrapper } from './ActionModuleWrapper';

/** Describes a native module capable of handling actions standalone. */
export interface ActionModule {
  /** Returns current version of 3DS2 library */
  threeDS2SdkVersion: string;

  /**
   * Handle a payment action received from Adyen API.
   * @param action - The payment action to be handled.
   */
  handle: (
    action: PaymentAction,
    configuration: BaseConfiguration
  ) => Promise<PaymentDetailsData>;

  /**
   * Dismiss the component from the screen.
   * @param success - Indicates whether the component was dismissed successfully.
   */
  hide: (success: boolean) => void;
}

/** Standalone Action Handling module. */
export const AdyenAction: ActionModule = new ActionModuleWrapper(
  NativeModules.AdyenAction ?? ModuleMock
);
