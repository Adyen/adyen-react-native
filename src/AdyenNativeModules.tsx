import { NativeModule, NativeModules } from 'react-native';
import {
  find,
  NATIVE_COMPONENTS,
  UNSUPPORTED_PAYMENT_METHODS,
} from './ComponentMap';
import {
  ErrorCode,
  LINKING_ERROR,
  UNKNOWN_PAYMENT_METHOD_ERROR,
  UNSUPPORTED_PAYMENT_METHOD_ERROR,
} from './Core/constants';
import {
  Card,
  PaymentAction,
  PaymentMethod,
  PaymentMethodsResponse,
} from './Core/types';

/** Options of dismissing the payment component */
export interface HideOption {
  /** Alert message after dismiss. Used for Android DropIn and Components only */
  message?: string;
}

/** Universal interface for Adyen Native payment component */
export interface AdyenComponent {
  /** Show component above current screen. */
  open: (paymentMethods: PaymentMethodsResponse, configuration: any) => void;

  /** Dismiss component from screen. */
  hide: (success: boolean, option?: HideOption) => void;
}

/** Describes Adyen Component capable of handling action */
export interface AdyenActionComponent extends AdyenComponent {
  handle: (action: PaymentAction) => void;
}

/**
 * @private
 *  Wrapper for all Native Modules that do not support Action handling.
 * */
class AdyenNativeComponentWrapper implements AdyenActionComponent {
  canHandleAction: boolean;
  nativeModule: NativeModule | any;
  constructor(nativeModule: NativeModule, canHandleAction: boolean = true) {
    this.nativeModule = nativeModule;
    this.canHandleAction = canHandleAction;
  }

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
    case 'drop-in':
    case 'adyendropin':
      return {
        nativeComponent: new AdyenNativeComponentWrapper(AdyenDropIn),
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
        nativeComponent: new AdyenNativeComponentWrapper(AdyenGooglePay, false),
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
      nativeComponent: new AdyenNativeComponentWrapper(AdyenDropIn),
      paymentMethod: paymentMethod,
    };
  }

  return {
    nativeComponent: new AdyenNativeComponentWrapper(AdyenInstant),
    paymentMethod: paymentMethod,
  };
}
