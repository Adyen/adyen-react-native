import React, {
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  useState,
  useMemo,
} from 'react';
import { ErrorCode } from '../core';
import type {
  AdyenActionComponent,
  AdyenComponent,
  AdyenError,
  Configuration,
  PaymentDetailsData,
  PaymentMethodData,
  PaymentMethodsResponse,
  SessionConfiguration,
  SessionsResult,
} from '../core';
import {
  AdyenCheckoutContext,
  type AdyenCheckoutContextType,
} from '../hooks/useAdyenCheckout';
import { getWrapper } from '../modules/base/getWrapper';
import { SessionHelper } from '../modules/session/SessionHelperModule';
import type { SessionContext } from '../modules/session/types';
import { checkConfiguration, checkPaymentMethodsResponse } from './utils';
import {
  startEventListeners,
  type EventHandlerRefs,
} from './startEventListeners';
import { AdyenComponentContext } from '../hooks/useComponent';
import { useSubscriptionManager } from '../hooks/useEmbeddedComponentBus';

/**
 * Props for AdyenCheckout
 */
export type AdyenCheckoutProps = {
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
    data: PaymentDetailsData,
    component: AdyenActionComponent
  ) => void;
  /**
   * An optional callback function invoked when a payment session or component
   * interaction is successfully completed. This method provides the result of the session
   * and a reference to the Adyen component that triggered the completion.
   * @param result - The response object containing encoded result data and result code of the completed session.
   * @param component - The Adyen component instance that completed the interaction.
   */
  onComplete?: (result: SessionsResult, component: AdyenComponent) => void;
  /** Inner components */
  children: ReactNode;
};

export const AdyenCheckout: React.FC<AdyenCheckoutProps> = ({
  config,
  paymentMethods,
  session,
  onSubmit,
  onError,
  onAdditionalDetails,
  onComplete,
  children,
}) => {
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onSubmitRef = useRef(onSubmit);
  const onAdditionalDetailsRef = useRef(onAdditionalDetails);
  const configRef = useRef(config);

  const eventHandlerRefs = useMemo<EventHandlerRefs>(
    () => ({
      onSubmit: onSubmitRef,
      onError: onErrorRef,
      onComplete: onCompleteRef,
      onAdditionalDetails: onAdditionalDetailsRef,
      config: configRef,
    }),
    []
  );

  const { subscribe, unsubscribe, removeEventListeners, storeEventListeners } =
    useSubscriptionManager(eventHandlerRefs);

  const [sessionContext, setSessionContext] = useState<
    SessionContext | undefined
  >(undefined);

  const currentPaymentMethods = useMemo<
    PaymentMethodsResponse | undefined
  >(() => {
    return paymentMethods ?? sessionContext?.paymentMethods;
  }, [paymentMethods, sessionContext]);

  useEffect(() => {
    checkConfiguration(config);
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    onAdditionalDetailsRef.current = onAdditionalDetails;
  }, [onAdditionalDetails]);

  useEffect(() => {
    const completeHandler = (result: any) =>
      onCompleteRef.current?.(result, SessionHelper);
    const errorHandler = (error: any) =>
      onErrorRef.current?.(error, SessionHelper);

    SessionHelper.assignCompletionHandler(completeHandler);
    SessionHelper.assignErrorHandler(errorHandler);

    return () => {
      SessionHelper.removeAllListeners();
      SessionHelper.hide(true);
    };
  }, []);

  useEffect(() => {
    if (session && !sessionContext) {
      SessionHelper.createSession(session, configRef.current)
        .then((sessionResponse) => setSessionContext(sessionResponse))
        .catch((error) => {
          const errorDTO: AdyenError = {
            message: String(error),
            errorCode: ErrorCode.sessionError,
          };
          onErrorRef.current?.(errorDTO, SessionHelper);
        });
    }
  }, [session, sessionContext]);

  const start = useCallback(
    (typeName: string) => {
      const validPaymentMethods = checkPaymentMethodsResponse(
        currentPaymentMethods
      );

      const { nativeComponent, paymentMethod } = getWrapper(
        typeName,
        validPaymentMethods
      );

      removeEventListeners(nativeComponent);
      const listeners = startEventListeners(nativeComponent, eventHandlerRefs);
      storeEventListeners(nativeComponent, listeners);

      if (paymentMethod) {
        const singlePaymentMethods = { paymentMethods: [paymentMethod] };
        const singlePaymentConfig = {
          ...configRef.current,
          dropin: { skipListWhenSinglePaymentMethod: true },
        };
        nativeComponent.open(singlePaymentMethods, singlePaymentConfig);
      } else {
        nativeComponent.open(validPaymentMethods, configRef.current);
      }
    },
    [
      eventHandlerRefs,
      currentPaymentMethods,
      removeEventListeners,
      storeEventListeners,
    ]
  );

  const checkoutContextValue = useMemo<AdyenCheckoutContextType>(
    () => ({
      start,
      config: configRef.current,
      paymentMethods: currentPaymentMethods,
      isReady: currentPaymentMethods !== undefined,
    }),
    [currentPaymentMethods, start]
  );

  return (
    <AdyenCheckoutContext.Provider value={checkoutContextValue}>
      <AdyenComponentContext.Provider value={{ subscribe, unsubscribe }}>
        {children}
      </AdyenComponentContext.Provider>
    </AdyenCheckoutContext.Provider>
  );
};
