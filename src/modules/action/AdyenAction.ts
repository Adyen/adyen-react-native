import type {
  Configuration,
  PaymentAction,
  PaymentDetailsData,
} from '../../core';
import { ActionModuleWrapper } from './ActionModuleWrapper';
import NativeAdyenAction from '../../specs/NativeAdyenAction';

/** Describes a native module capable of handling actions standalone. */
export interface ActionModule {
  /** Returns the current version of the 3DS2 library. */
  getThreeDS2SdkVersion(): Promise<string>;

  /**
   * Handle a payment action received from Adyen API.
   * @param action - The payment action to be handled.
   * @param configuration - Must include the exact return URL supplied with the payment request.
   */
  handle: (
    action: PaymentAction,
    configuration: Configuration
  ) => Promise<PaymentDetailsData>;

  /**
   * Cancels the active standalone action, if any.
   *
   * Only one standalone action can be active at a time. A concurrent `handle` rejects with
   * `actionBusy`; `hide` rejects the owned `handle` promise with `cancelled` and resolves once
   * native UI and callback resources have been released.
   */
  hide(): Promise<void>;
}

/** Standalone Action Handling module. */
export const AdyenAction: ActionModule = new ActionModuleWrapper(
  NativeAdyenAction
);
