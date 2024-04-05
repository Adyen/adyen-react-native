import {NativeModule} from 'react-native';
import {
  find,
  NATIVE_COMPONENTS,
  UNSUPPORTED_PAYMENT_METHODS,
} from './ComponentMap';
import {
  UNKNOWN_PAYMENT_METHOD_ERROR,
  UNSUPPORTED_PAYMENT_METHOD_ERROR,
} from './core/constants';
import {PaymentMethod, PaymentMethodsResponse} from './core/types';
import {AdyenNativeComponentWrapper} from './AdyenNativeComponentWrapper';
import {
  AdyenActionComponent,
  AdyenDropIn,
  AdyenApplePay,
  AdyenGooglePay,
  AdyenInstant,
} from './AdyenNativeModules';

/**
 * Get native component capable of handling provided payment method type.
 */
export function getNativeComponent(
  typeName: string,
  paymentMethods: PaymentMethodsResponse,
): {
  nativeComponent: AdyenActionComponent & NativeModule;
  paymentMethod?: PaymentMethod;
} {
  switch (typeName) {
    case 'dropin':
    case 'dropIn':
    case 'drop-in':
    case 'adyendropin':
      return {
        nativeComponent: new AdyenNativeComponentWrapper({
          nativeModule: AdyenDropIn,
        }),
      };
    case 'applepay':
      return {
        nativeComponent: new AdyenNativeComponentWrapper({
          nativeModule: AdyenApplePay,
          canHandleAction: false,
        }),
      };
    case 'paywithgoogle':
    case 'googlepay':
      return {
        nativeComponent: new AdyenNativeComponentWrapper({
          nativeModule: AdyenGooglePay,
        }),
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

  const nativeModule = NATIVE_COMPONENTS.includes(typeName)
    ? AdyenDropIn
    : AdyenInstant;
  return {
    nativeComponent: new AdyenNativeComponentWrapper({
      nativeModule: nativeModule,
    }),
    paymentMethod: paymentMethod,
  };
}
