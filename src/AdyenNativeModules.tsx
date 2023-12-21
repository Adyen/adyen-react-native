import { NativeModule, NativeModules } from 'react-native';
import {
  find,
  NATIVE_COMPONENTS,
  UNSUPPORTED_PAYMENT_METHODS,
} from './ComponentMap';
import {
  ErrorCode,
  Event,
  LINKING_ERROR,
  UNKNOWN_PAYMENT_METHOD_ERROR,
  UNSUPPORTED_PAYMENT_METHOD_ERROR,
} from './Core/constants';
import {
  Card,
  PaymentAction,
  PaymentMethod,
  PaymentMethodsResponse,
  SessionResponse,
} from './Core/types';

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

/** Collection of android helper methods */
export interface SessionHelperModule {
  /**
   * Provides return URL for current application. 
   */
  getReturnURL: () => Promise<string>;

  /**
   * Provides paymentMethods for sessionData and SessionID. 
   */
  createSession: (session: any, configuration: any) => Promise<SessionResponse>;
}

/**
 * @private
 *  Wrapper for all Native Modules that do not support Action handling.
 * */
class AdyenNativeComponentWrapper implements AdyenActionComponent {
  canHandleAction: boolean;
  nativeModule: NativeModule | any;
  constructor(
    nativeModule: NativeModule,
    canHandleAction: boolean = true,
    events: string[] = []
  ) {
    this.nativeModule = nativeModule;
    this.canHandleAction = canHandleAction;
    this.events = [Event.onError, ErrorCode.canceled];

    events?.forEach((element) => this.events.push(element));

    if (canHandleAction) {
      this.events.push(Event.onAdditionalDetails);
    }
  }

  events: string[];

  addListener(eventType: string) {
    this.nativeModule.addListener(eventType);
  }
  removeListeners(count: number) {
    this.nativeModule.removeListeners(count);
  }
  handle(action: PaymentAction) {
    if (this.canHandleAction) {
      this.nativeModule.handle(action);
    } else {
      throw Error(ErrorCode.notSupportedAction);
    }
  }
  open(paymentMethods: PaymentMethodsResponse, configuration: any) {
    this.nativeModule.open(paymentMethods, configuration);
  }
  hide(success: boolean, option?: { message?: string }) {
    if (option != null && option.message != null) {
      this.nativeModule.hide(success, option);
    } else {
      this.nativeModule.hide(success, { message: '' });
    }
  }
}

/** Drop-in is our pre-built UI solution for accepting payments. Drop-in shows all payment methods as a list and handles actions. */
export const AdyenDropIn: AdyenActionComponent & NativeModule =
  NativeModules.AdyenDropIn
    ? NativeModules.AdyenDropIn
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );

/** Generic Redirect component */
export const AdyenInstant: AdyenActionComponent & NativeModule =
  NativeModules.AdyenInstant
    ? NativeModules.AdyenInstant
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );

/** Apple Pay component (only available for iOS) */
export const AdyenApplePay: AdyenComponent & NativeModule =
  NativeModules.AdyenApplePay
    ? NativeModules.AdyenApplePay
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );

/** Google Pay component (only available for Android) */
export const AdyenGooglePay: AdyenComponent & NativeModule =
  NativeModules.AdyenGooglePay
    ? NativeModules.AdyenGooglePay
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );

/** Collection of session helper methods */
export const SessionHelper: SessionHelperModule =
  NativeModules.SessionHelper
    ? NativeModules.SessionHelper
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      );

/** Describes Adyen Component capable of handling action */
interface AdyenCSE extends NativeModule {
  /** Method to encrypt card. */
  encryptCard: (payload: Card, publicKey: string) => Promise<Card>;

  /** Method to encrypt BIN(first 6-11 digits of the card). */
  encryptBin: (payload: string, publicKey: string) => Promise<string>;
}

/**Encryption helper. */
export const AdyenCSE: AdyenCSE = NativeModules.AdyenCSE
  ? NativeModules.AdyenCSE
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * Get native component capable of handling provided payment method type.
 */
export function getNativeComponent(
  typeName: string,
  paymentMethods: PaymentMethodsResponse
): {
  nativeComponent: AdyenActionComponent & NativeModule;
  paymentMethod: PaymentMethod | undefined;
} {
  switch (typeName) {
    case 'dropin':
    case 'dropIn':
    case 'drop-in':
    case 'adyendropin':
      return {
        nativeComponent: new AdyenNativeComponentWrapper(AdyenDropIn, true, [
          Event.onComplete,
        ]),
        paymentMethod: undefined,
      };
    case 'applepay':
      return {
        nativeComponent: new AdyenNativeComponentWrapper(AdyenApplePay, false),
        paymentMethod: undefined,
      };
    case 'paywithgoogle':
    case 'googlepay':
      return {
        nativeComponent: new AdyenNativeComponentWrapper(AdyenGooglePay),
        paymentMethod: undefined,
      };
    default:
      break;
  }

  const paymentMethod = find(paymentMethods, typeName);
  if (!paymentMethod) {
    throw new Error(UNKNOWN_PAYMENT_METHOD_ERROR + typeName);
  }

  if (UNSUPPORTED_PAYMENT_METHODS.includes(typeName)) {
    throw new Error(UNSUPPORTED_PAYMENT_METHOD_ERROR + typeName);
  }

  if (NATIVE_COMPONENTS.includes(typeName)) {
    return {
      nativeComponent: new AdyenNativeComponentWrapper(AdyenDropIn, true, [
        Event.onComplete,
      ]),
      paymentMethod: paymentMethod,
    };
  }

  return {
    nativeComponent: new AdyenNativeComponentWrapper(AdyenInstant),
    paymentMethod: paymentMethod,
  };
}
