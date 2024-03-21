import {NativeModule, NativeModules} from 'react-native';
import {LINKING_ERROR} from './Core/constants';
import {
  Card,
  PaymentAction,
  PaymentMethodsResponse,
  SessionResponse,
} from './Core/types';
import {BaseConfiguration} from './Core/configuration';
import {ActionModuleWrapper} from './ActionModuleWrapper';

/**
 * Options for dismissing the payment component.
 */
export interface HideOption {
  /** Alert message after dismiss. Used for Android DropIn and Components only */
  message?: string;
}

/**
 * Universal interface for an Adyen Native payment component.
 */
export interface AdyenComponent {
  /**
   * Show the component above the current screen.
   * @param paymentMethods - The available payment methods.
   * @param configuration - The configuration for the component.
   */
  open: (paymentMethods: PaymentMethodsResponse, configuration: any) => void;

  /**
   * Dismiss the component from the screen.
   * @param success - Indicates whether the component was dismissed successfully.
   * @param option - Additional options for dismissing the component (optional).
   */
  hide: (success: boolean, option?: HideOption) => void;
}

/**
 * Describes an Adyen Component capable of handling payment actions.
 */
export interface AdyenActionComponent extends AdyenComponent {
  /**
   * Handle a payment action received by the component.
   * @param action - The payment action to be handled.
   */
  handle: (action: PaymentAction) => void;

  /**
   * List of events supported by component
   */
  events: string[];
}

/** Describes a native module capable of creating new sessions. */
export interface SessionHelperModule extends AdyenComponent {
  /**
   * Provides paymentMethods for sessionData and SessionID.
   */
  createSession: (session: any, configuration: any) => Promise<SessionResponse>;
}

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
    configuration: BaseConfiguration,
  ) => Promise<PaymentMethodData>;

  /**
   * Dismiss the component from the screen.
   * @param success - Indicates whether the component was dismissed successfully.
   */
  hide: (success: boolean) => void;
}

/** Describes Drop-in module. */
export interface DropInModule extends AdyenActionComponent, NativeModule {
  /**
   * Provides return URL for current application.
   */
    getReturnURL: () => Promise<string>;
}

/** Describes a native module capable of encrypting card data. */
export interface AdyenCSEModule extends NativeModule {
  /** Method to encrypt card. */
  encryptCard: (payload: Card, publicKey: string) => Promise<Card>;

  /** Method to encrypt BIN(first 6-11 digits of the card). */
  encryptBin: (payload: string, publicKey: string) => Promise<string>;
}

const ModuleMock = new Proxy(
  {},
  {
    get() {
      throw new Error(LINKING_ERROR);
    },
  },
);

/** Drop-in is our pre-built UI solution for accepting payments. Drop-in shows all payment methods as a list and handles actions. */
export const AdyenDropIn: DropInModule =
  NativeModules.AdyenDropIn ?? ModuleMock;

/** Generic Redirect component */
export const AdyenInstant: AdyenActionComponent & NativeModule =
  NativeModules.AdyenInstant ?? ModuleMock;

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: AdyenComponent & NativeModule =
  NativeModules.AdyenApplePay ?? ModuleMock;

/** Google Pay component (only available for Android) */
export const AdyenGooglePay: AdyenComponent & NativeModule =
  NativeModules.AdyenGooglePay ?? ModuleMock;

/** Collection of session helper methods */
export const SessionHelper: SessionHelperModule =
  NativeModules.SessionHelper ?? ModuleMock;

/**Encryption helper. */
export const AdyenCSE: AdyenCSEModule = NativeModules.AdyenCSE ?? ModuleMock;

/** Standalone Action Handling module. */
export const AdyenAction: ActionModule =
  new ActionModuleWrapper(NativeModules.AdyenAction) ?? ModuleMock;
