import {
  ADDRESS_COMPONENTS,
  NATIVE_COMPONENTS,
  UNSUPPORTED_PAYMENT_METHODS,
  type AdyenActionComponent,
  type PaymentMethod,
  type PaymentMethodsResponse,
} from '../../core';
import { AdyenDropIn } from '../dropin/AdyenDropIn';
import { AdyenApplePay } from '../applepay/AdyenApplePay';
import { AdyenGooglePay } from '../googlepay/AdyenGooglePay';
import { AdyenInstant } from '../instant/AdyenInstant';
import type { ApplePayWrapper } from '../applepay/ApplePayWrapper';
import type { DropInWrapper } from '../dropin/DropInWrapper';
import type { GooglePayWrapper } from '../googlepay/GooglePayWrapper';
import type { InstantWrapper } from '../instant/InstantWrapper';
import {
  UNKNOWN_PAYMENT_METHOD_ERROR,
  UNSUPPORTED_PAYMENT_METHOD_ERROR,
} from './constants';
import { find } from './utils';
import type { ActionHandlingComponentWrapper } from './ActionHandlingComponentWrapper';
import type { PaymentComponentWrapper } from './PaymentComponentWrapper';

/**
 * Get native component capable of handling provided payment method type.
 */
export function getWrapper(
  typeName: string,
  paymentMethods: PaymentMethodsResponse
): {
  nativeComponent: PaymentComponentWrapper & AdyenActionComponent;
  paymentMethod?: PaymentMethod;
} {
  switch (typeName) {
    case 'dropin':
    case 'dropIn':
    case 'drop-in':
    case 'adyendropin':
      return {
        nativeComponent: AdyenDropIn as DropInWrapper,
      };
    case 'applepay':
      return {
        nativeComponent: AdyenApplePay as ApplePayWrapper,
      };
    case 'paywithgoogle':
    case 'googlepay':
      return {
        nativeComponent: AdyenGooglePay as GooglePayWrapper,
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

  let nativeComponent: ActionHandlingComponentWrapper;
  // Currently this resolves address lookup and bin lookup callbacks for Dropin-based Card payment.
  if (ADDRESS_COMPONENTS.includes(typeName)) {
    nativeComponent = AdyenDropIn as DropInWrapper;
  } else {
    nativeComponent = NATIVE_COMPONENTS.includes(typeName)
      ? (AdyenDropIn as DropInWrapper)
      : (AdyenInstant as InstantWrapper);
  }

  return {
    nativeComponent,
    paymentMethod,
  };
}
