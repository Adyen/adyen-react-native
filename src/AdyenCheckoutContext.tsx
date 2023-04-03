import React, {
  useRef,
  useCallback,
  createContext,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';
import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModule,
} from 'react-native';
import { Event } from './Core/constants';
import { getNativeComponent, AdyenActionComponent } from './AdyenNativeModules';
import { PaymentMethodData, PaymentMethodsResponse } from './Core/types';
import { Configuration } from './Core/configuration';
import { checkPaymentMethodsResponse, checkConfiguration } from './Core/utils';

export interface AdyenCheckoutContextType {
  start: (typeName: string) => void;
  config: Configuration;
  paymentMethods?: PaymentMethodsResponse;
}

const AdyenCheckoutContext = createContext<AdyenCheckoutContextType | null>(
  null
);

/** Reason for payment termination */
interface AdyenError {
  message: string;
  errorCode: string;
}

type AdyenCheckoutProps = {
  /** Collection of all necessary configurations */
  config: Configuration;
  /** JSON response from Adyen API `\paymentMethods` */
  paymentMethods: PaymentMethodsResponse;
  /** Event callback, called when the shopper selects the Pay button and payment details are valid. */
  onSubmit: (data: PaymentMethodData, component: AdyenActionComponent) => void;
  /** Event callback, called when payment about to be terminate. */
  onError: (error: AdyenError, component: AdyenActionComponent) => void;
  /** Event callback, called when a payment method requires more details, for example for native 3D Secure 2, or native QR code payment methods. */
  onAdditionalDetails?: (
    data: PaymentMethodData,
    component: AdyenActionComponent
  ) => void;
  /** Event callback, called when a shopper finishes the flow (Voucher payments only). */
  onComplete?: (component: AdyenActionComponent) => void;
  /** Inner components */
  children: ReactNode;
};

const AdyenCheckout: React.FC<AdyenCheckoutProps> = ({
  config,
  paymentMethods,
  onSubmit,
  onError,
  onAdditionalDetails,
  onComplete,
  children,
}) => {
  const subscriptions = useRef<EmitterSubscription[]>([]);

  useEffect(() => {
    return () => {
      removeEventListeners();
    };
  }, []);

  const submitPayment = useCallback(
    (
      configuration: Configuration,
      data: any,
      nativeComponent: AdyenActionComponent
    ) => {
      const payload = {
        ...data,
        returnUrl: data.returnUrl ?? configuration.returnUrl,
      };
      onSubmit(payload, nativeComponent);
    },
    [onSubmit]
  );

  const removeEventListeners = useCallback(() => {
    subscriptions.current.forEach((s) => s.remove());
  }, [subscriptions]);

  const startEventListeners = useCallback(
    (
      configuration: Configuration,
      nativeComponent: AdyenActionComponent & NativeModule
    ) => {
      const eventEmitter = new NativeEventEmitter(nativeComponent);
      subscriptions.current = [
        eventEmitter.addListener(Event.onSubmit, (data) =>
          submitPayment(configuration, data, nativeComponent)
        ),
        eventEmitter.addListener(Event.onAdditionalDetails, (data) =>
          onAdditionalDetails?.(data, nativeComponent)
        ),
        eventEmitter.addListener(Event.onComplete, () => {
          onComplete?.(nativeComponent);
        }),
        eventEmitter.addListener(Event.onError, (error: AdyenError) => {
          onError?.(error, nativeComponent);
        }),
      ];
    },
    [
      submitPayment,
      removeEventListeners,
      onAdditionalDetails,
      onComplete,
      onError,
      subscriptions,
    ]
  );

  const start = useCallback(
    (typeName: string) => {
      removeEventListeners();
      const { nativeComponent, paymentMethod } = getNativeComponent(
        typeName,
        paymentMethods
      );

      checkPaymentMethodsResponse(paymentMethods);
      checkConfiguration(config);

      startEventListeners(config, nativeComponent);

      if (paymentMethod) {
        const singlePaymentMethods = { paymentMethods: [paymentMethod] };
        const singlePaymentConfig = {
          ...config,
          dropin: { skipListWhenSinglePaymentMethod: true },
        };
        nativeComponent.open(singlePaymentMethods, singlePaymentConfig);
      } else {
        nativeComponent.open(paymentMethods, config);
      }
    },
    [config, paymentMethods, startEventListeners, removeEventListeners]
  );

  const checkoutProviderValues = useMemo(
    () => ({ start, config, paymentMethods }),
    [start, config, paymentMethods]
  );

  return (
    <AdyenCheckoutContext.Provider value={checkoutProviderValues}>
      {children}
    </AdyenCheckoutContext.Provider>
  );
};

export { AdyenCheckoutContext, AdyenCheckout, AdyenCheckoutProps };
