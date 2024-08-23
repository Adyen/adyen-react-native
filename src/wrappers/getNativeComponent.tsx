import { NativeModule, Platform } from 'react-native';
import {
  ADDRESS_COMPONENTS,
  find,
  NATIVE_COMPONENTS,
  UNSUPPORTED_PAYMENT_METHODS,
} from '../ComponentMap';
import {
  UNKNOWN_PAYMENT_METHOD_ERROR,
  UNSUPPORTED_PAYMENT_METHOD_ERROR,
} from '../core/constants';
import { PaymentMethod, PaymentMethodsResponse } from '../core/types';
import { ComponentWrapper } from './ComponentWrapper';
import { ActionHandlingComponentWrapper as ActionHandlingComponentWrapper } from './ActionHandlingComponentWrapper';
import { AdyenComponent } from '../core/AdyenNativeModules';
import { AdyenGooglePay } from '../modules/NativeModules';
import { AdyenApplePay } from '../modules/NativeModules';
import { AdyenInstant } from '../modules/NativeModules';
import { AdyenDropIn } from '../modules/DropInModule';
import { DropInComponentWrapper } from './DropInComponentWrapper';

/**
 * Get native component capable of handling provided payment method type.
 */
export function getWrapper(
  typeName: string,
  paymentMethods: PaymentMethodsResponse
): {
  nativeComponent: AdyenComponent & NativeModule;
  paymentMethod?: PaymentMethod;
} {
  switch (typeName) {
    case 'dropin':
    case 'dropIn':
    case 'drop-in':
    case 'adyendropin':
      return {
        nativeComponent: new DropInComponentWrapper({
          nativeModule: AdyenDropIn,
        }),
      };
    case 'applepay':
      return {
        nativeComponent: new ComponentWrapper({
          nativeModule: AdyenApplePay,
        }),
      };
    case 'paywithgoogle':
    case 'googlepay':
      return {
        nativeComponent: new ActionHandlingComponentWrapper({
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

  let nativeComponent: AdyenComponent & NativeModule;
  if (ADDRESS_COMPONENTS.includes(typeName)) {
    nativeComponent = new DropInComponentWrapper({
      nativeModule: AdyenDropIn,
    });
  } else {
    // New iDEAL not treated as INSTANT on Android
    var extendedComponentList = NATIVE_COMPONENTS;
    if (Platform.OS === `android`) {
      extendedComponentList.push(`ideal`);
    }
    const nativeModule = extendedComponentList.includes(typeName)
      ? AdyenDropIn
      : AdyenInstant;
    nativeComponent = new ActionHandlingComponentWrapper({
      nativeModule: nativeModule,
    });
  }

  return {
    nativeComponent: nativeComponent,
    paymentMethod: paymentMethod,
  };
}
