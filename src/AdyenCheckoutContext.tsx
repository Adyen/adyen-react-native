import React, {
  useRef,
  useCallback,
  createContext,
  useEffect,
  useContext,
  ReactNode,
  useState,
} from 'react';
import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModule,
} from 'react-native';
import {Event, MISSING_CONTEXT_ERROR} from './Core/constants';
import {
  AdyenActionComponent,
  AdyenComponent,
  SessionHelper,
} from './AdyenNativeModules';
import { getNativeComponent } from './getNativeComponent';
import {
  AdyenError,
  PaymentMethodsResponse,
  SessionConfiguration,
  SessionResponse,
} from './Core/types';
import {Configuration} from './Core/configuration';
import {checkPaymentMethodsResponse, checkConfiguration} from './Core/utils';
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
  null,
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
  /** The payment session data from backend response. */
  session?: SessionConfiguration;
  /**
   * Event callback, called when the shopper selects the Pay button and payment details are valid.
   * @param data - The payment method data.
   * @param component - The Adyen payment component.
   * @param extra - Additional data (optional).
   */
  onSubmit?: (
    data: PaymentMethodData,
    component: AdyenActionComponent,
    extra?: any,
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
    component: AdyenActionComponent,
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
  session,
  onSubmit,
  onError,
  onAdditionalDetails,
  onComplete,
  children,
}) => {
  const subscriptions = useRef<EmitterSubscription[]>([]);
  const analytics = useRef<Analytics | null>(null);
  const [sessionStorage, setSession] = useState<SessionResponse | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      removeEventListeners();
    };
  }, []);

  useEffect(() => {
    if (session) {
      createSession();
    }
  }, [session]);

  const submitPayment = useCallback(
    (
      configuration: Configuration,
      data: any,
      nativeComponent: AdyenActionComponent,
      extra: any,
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
    [onSubmit, analytics],
  );

  const removeEventListeners = useCallback(() => {
    subscriptions.current.forEach((s) => s.remove());
    analytics.current = null;
  }, [subscriptions, analytics]);

  const startEventListeners = useCallback(
    (
      configuration: Configuration,
      nativeComponent: AdyenActionComponent & NativeModule,
    ) => {
      const eventEmitter = new NativeEventEmitter(nativeComponent);
      subscriptions.current = [
        eventEmitter.addListener(Event.onSubmit, (response) =>
          submitPayment(
            configuration,
            response.paymentData,
            nativeComponent,
            response.extra,
          ),
        ),
        eventEmitter.addListener(
          Event.onError,
          (error: AdyenError) => onError?.(error, nativeComponent),
        ),
      ];

      if (nativeComponent.events.includes(Event.onAdditionalDetails)) {
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onAdditionalDetails,
            (data) => onAdditionalDetails?.(data, nativeComponent),
          ),
        );
      }

      if (nativeComponent.events.includes(Event.onComplete)) {
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onComplete,
            (data) => onComplete?.(data, nativeComponent),
          ),
        );
      }
    },
    [submitPayment, onAdditionalDetails, onComplete, onError, subscriptions],
  );

  const start = useCallback(
    (typeName: string) => {
      removeEventListeners();
      analytics.current = new Analytics(config);

      const currentPaymentMethods = checkPaymentMethodsResponse(
        paymentMethods ?? sessionStorage?.paymentMethods,
      );

      const {nativeComponent, paymentMethod} = getNativeComponent(
        typeName,
        currentPaymentMethods,
      );

      checkConfiguration(config);

      startEventListeners(config, nativeComponent);

      if (paymentMethod) {
        const singlePaymentMethods = {paymentMethods: [paymentMethod]};
        const singlePaymentConfig = {
          ...config,
          dropin: {skipListWhenSinglePaymentMethod: true},
        };
        analytics.current.send({component: typeName});
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
      sessionStorage,
      startEventListeners,
      removeEventListeners,
      analytics,
    ],
  );

  const createSession = useCallback(() => {
    SessionHelper.createSession(session, config)
      .then((sessionResponse) => {
        setSession(sessionResponse);
      })
      .catch((e) => {
        onError(
          {
            message: JSON.stringify(e),
            errorCode: 'sessionError',
          },
          SessionHelper,
        );
      });
  }, [session, config, onError]);
  

  return (
    <AdyenCheckoutContext.Provider
      value={{
        start,
        config,
        paymentMethods: paymentMethods ?? sessionStorage?.paymentMethods,
      }}
    >
      {children}
    </AdyenCheckoutContext.Provider>
  );
};

export {
  AdyenCheckoutContextType,
  AdyenCheckout,
  AdyenCheckoutProps,
  useAdyenCheckout,
};
