import React, {
  useRef,
  useCallback,
  createContext,
  useEffect,
  useMemo,
  useContext,
  ReactNode,
} from 'react';
import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModule,
  NativeModules,
} from 'react-native';
import { Event, MISSING_CONTEXT_ERROR } from './Core/constants';
import { getNativeComponent, AdyenActionComponent, AdyenComponent } from './AdyenNativeModules';
import { AdyenError, PaymentMethodsResponse, Session } from './Core/types';
import { Configuration } from './Core/configuration';
import { checkPaymentMethodsResponse, checkConfiguration } from './Core/utils';
import Analytics from './Core/Analytics';

/**
 * Returns AdyenCheckout context. This context allows you to initiate payment with Drop-in or any payment method available in `paymentMethods` collection.
 */
interface AdyenCheckoutContextType {
  start: (typeName: string) => void;
  config: Configuration;
  paymentMethods?: PaymentMethodsResponse;
}

const AdyenCheckoutContext = createContext<AdyenCheckoutContextType | null>(
  null
);

/**
 * Returns AdyenCheckout context. This context allows you to initiate payment with Drop-in or any payment method available in `paymentMethods` collection.
 */
const useAdyenCheckout = (): AdyenCheckoutContextType => {
  const context = useContext(AdyenCheckoutContext);
  if (context != null) {
    return context;
  }
  throw new Error(MISSING_CONTEXT_ERROR);
};

/**
 * Props for AdyenCheckout
 */
type AdyenCheckoutProps = {
  /** Collection of all necessary configurations */
  config: Configuration;
  /** JSON response from Adyen API `\paymentMethods` */
  paymentMethods?: PaymentMethodsResponse;
  /** The payment session data. */
  sessionData?: String;
  /** A unique identifier of the session. */
  sessionID?: String;
  /**
   * Event callback, called when the shopper selects the Pay button and payment details are valid.
   * @param data - The payment method data.
   * @param component - The Adyen payment component.
   * @param extra - Additional data (optional).
   */
  onSubmit?: (
    data: PaymentMethodData,
    component: AdyenActionComponent,
    extra?: any
  ) => void;
  /**
   * Event callback, called when payment about to be terminate.
   * @param data - The payment method data.
   * @param component - The Adyen payment component.
   */
  onError: (error: AdyenError, component: AdyenComponent) => void;
  /**
   * Event callback, called when a payment method requires more details, for example for native 3D Secure 2, or native QR code payment methods.
   * @param data - The payment method data.
   * @param component - The Adyen payment component.
   */
  onAdditionalDetails?: (
    data: PaymentMethodData,
    component: AdyenActionComponent
  ) => void;
  /**
   * Event callback, called when a shopper finishes the flow (Voucher payments only).
   * @param component - The Adyen payment component.
   */
  onComplete?: (result: string, component: AdyenActionComponent) => void;
  /** Inner components */
  children: ReactNode;
};


const AdyenCheckout: React.FC<AdyenCheckoutProps> = ({
  config,
  paymentMethods,
  sessionID,
  sessionData,
  onSubmit,
  onError,
  onAdditionalDetails,
  onComplete,
  children,
}) => {
  const subscriptions = useRef<EmitterSubscription[]>([]);
  const analytics = useRef<Analytics | null>(null);
  const session = useRef<Session | null>(null);

  useEffect(() => {
    return () => {
      removeEventListeners();
    };
  }, []);

  const submitPayment = useCallback(
    (
      configuration: Configuration,
      data: any,
      nativeComponent: AdyenActionComponent,
      extra: any
    ) => {
      const checkoutAttemptId = analytics.current?.checkoutAttemptId;
      if (data.paymentMethod && checkoutAttemptId) {
        data.paymentMethod.checkoutAttemptId = checkoutAttemptId;
      }

      const payload = {
        ...data,
        returnUrl: data.returnUrl ?? configuration.returnUrl,
      };
      onSubmit?.(payload, nativeComponent, extra);
    },
    [onSubmit, analytics]
  );

  const removeEventListeners = useCallback(() => {
    subscriptions.current.forEach((s) => s.remove());
    analytics.current = null;
  }, [subscriptions, analytics]);

  const startEventListeners = useCallback(
    (
      configuration: Configuration,
      nativeComponent: AdyenActionComponent & NativeModule
    ) => {
      const eventEmitter = new NativeEventEmitter(nativeComponent);
      subscriptions.current = [
        eventEmitter.addListener(Event.onSubmit, (response) =>
          submitPayment(
            configuration,
            response.paymentData,
            nativeComponent,
            response.extra
          )
        ),
        eventEmitter.addListener(Event.onError, (error: AdyenError) =>
          onError?.(error, nativeComponent)
        ),
      ];

      if (nativeComponent.events.includes(Event.onAdditionalDetails)) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onAdditionalDetails, (data) =>
            onAdditionalDetails?.(data, nativeComponent)
          )
        );
      }

      if (nativeComponent.events.includes(Event.onComplete)) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onComplete, (data) =>
            onComplete?.(JSON.stringify(data), nativeComponent) // TODO: provide result for voucher 
          )
        );
      }
    },
    [submitPayment, onAdditionalDetails, onComplete, onError, subscriptions]
  );

  const start = useCallback(
    (typeName: string) => {
      removeEventListeners();
      analytics.current = new Analytics(config);

      const currentPaymentMethods = checkPaymentMethodsResponse(paymentMethods ?? session.current?.paymentMethods);

      const { nativeComponent, paymentMethod } = getNativeComponent(
        typeName,
        currentPaymentMethods
      );

      checkConfiguration(config);

      startEventListeners(config, nativeComponent);

      if (paymentMethod) {
        const singlePaymentMethods = { paymentMethods: [paymentMethod] };
        const singlePaymentConfig = {
          ...config,
          dropin: { skipListWhenSinglePaymentMethod: true },
        };
        analytics.current.send({ component: typeName });
        nativeComponent.open(singlePaymentMethods, singlePaymentConfig);
      } else {
        analytics.current.send({
          paymentMethods: paymentMethods?.paymentMethods.map((e) => e.type),
          component: 'dropin',
          flavor: 'dropin',
        });
        nativeComponent.open(currentPaymentMethods, config);
      }
    },
    [
      config,
      paymentMethods,
      session,
      startEventListeners,
      removeEventListeners,
      analytics,
    ]
  );

  const createSession = useCallback(async () => {
    const clientKey = config.clientKey;
    const environment = config.environment;
    const newSession = await NativeModules.AdyenSession.createSession(sessionID, sessionData, clientKey, environment);
    session.current = newSession;
  }, [sessionID, sessionData, config]);

  const checkoutProviderValues = useMemo(
    () => ({ start, createSession, config, paymentMethods }),
    [start, createSession, config, paymentMethods ?? session.current?.paymentMethods]
  );

  return (
    <AdyenCheckoutContext.Provider value={checkoutProviderValues}>
      {children}
    </AdyenCheckoutContext.Provider>
  );
};

export { AdyenCheckoutContextType, AdyenCheckoutContext, AdyenCheckout, AdyenCheckoutProps, useAdyenCheckout };
