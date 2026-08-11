import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AdvancedCallbacks,
  AdyenError,
  ApplePayAuthorizationActions,
  ApplePayAuthorizationResult,
  ApplePayCouponCodeUpdateRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethodUpdateRequest,
  Checkout,
  Configuration,
  PaymentAdditionalResultHandler,
  PaymentDetailsData,
  PaymentMethodData,
  PaymentMethodsResponse,
  PaymentResultHandler,
  PaymentSubmitResultHandler,
  SessionCallbacks,
  SessionConfiguration,
  SessionsResult,
} from '../core';
import { createCheckout } from '../core/Checkout';
import {
  AdyenCheckoutContext,
  type AdyenCheckoutContextType,
} from '../hooks/useAdyenCheckout';
import {
  AdyenComponentContext,
  type AdyenComponentContextType,
} from '../hooks/useComponent';
import { useSubscriptionManager } from '../hooks/useSubscriptionManager';
import { AdyenContext } from '../modules/context/ContextModule';
import { checkConfiguration } from './utils/checkConfiguration';
import type { EventHandlerRefs } from './utils/startEventListeners';

/**
 * Builds a completion-only handler for the session-flow, error, and
 * additional-details callbacks. The SDK owns action/retry handling in these
 * flows, so the merchant is only handed `completion` — exposing `action`/`retry`
 * here would let merchants call methods the flow does not support.
 */
const createResultHandler = (): PaymentResultHandler => ({
  completion: (resultCode) => AdyenContext.completion(resultCode),
});

/**
 * Builds the full advanced-flow submit handler exposing the complete set of
 * outcomes the merchant may forward after a `/payments` call.
 */
const createSubmitHandler = (): PaymentSubmitResultHandler => ({
  action: (action) => AdyenContext.action(action),
  completion: (resultCode) => AdyenContext.completion(resultCode),
  retry: (message) => AdyenContext.retry(message),
});

/**
 * Props for AdyenCheckout.
 */
export type AdyenCheckoutProps = {
  /** Inner components. */
  children: ReactNode;
};

/**
 * Provider that owns the native checkout context lifecycle and exposes the
 * `useAdyenCheckout` hook. Payment flow callbacks are supplied to `setup()` /
 * `setupAdvanced()` rather than as props. Unmounting tears the context down.
 */
export const AdyenCheckout: React.FC<AdyenCheckoutProps> = ({ children }) => {
  const configRef = useRef<Configuration | null>(null);
  const sessionCallbacksRef = useRef<SessionCallbacks | null>(null);
  const advancedCallbacksRef = useRef<AdvancedCallbacks | null>(null);
  const checkoutRef = useRef<Checkout | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [config, setConfig] = useState<Configuration | null>(null);

  // Stable event handler refs delegating to whichever callback set is active.
  // They are handed to per-view listeners so embedded component events resolve
  // through the merchant callbacks with a viewId-bound result handler.
  const onSubmitRef = useRef<
    | ((data: PaymentMethodData, component: PaymentResultHandler) => void)
    | undefined
  >((data, component) =>
    advancedCallbacksRef.current?.onSubmit(
      data,
      component as PaymentSubmitResultHandler
    )
  );
  const onAdditionalDetailsRef = useRef<
    | ((data: PaymentDetailsData, component: PaymentResultHandler) => void)
    | undefined
  >((data, component) =>
    advancedCallbacksRef.current?.onAdditionalDetails(
      data,
      component as PaymentAdditionalResultHandler
    )
  );
  const onCompleteRef = useRef<
    | ((result: SessionsResult, component: PaymentResultHandler) => void)
    | undefined
  >((result, component) =>
    sessionCallbacksRef.current?.onComplete(result, component)
  );
  const onErrorRef = useRef<
    (error: AdyenError, component: PaymentResultHandler) => void
  >((error, component) => {
    const handler =
      advancedCallbacksRef.current?.onError ??
      sessionCallbacksRef.current?.onError;
    handler?.(error, component);
  });

  const eventHandlerRefs = useRef<EventHandlerRefs>({
    onSubmit: onSubmitRef,
    onError: onErrorRef,
    onComplete: onCompleteRef,
    onAdditionalDetails: onAdditionalDetailsRef,
    config: configRef,
  }).current;

  const { subscribe, unsubscribe } = useSubscriptionManager(eventHandlerRefs);

  useEffect(() => {
    return () => {
      AdyenContext.removeAllListeners();
      AdyenContext.cleanup();
      checkoutRef.current = null;
    };
  }, []);

  // Apple Pay sheet interactions (iOS) flow through AdyenContext events regardless of session or
  // advanced flow. Each handler invokes the matching merchant callback from the configuration and
  // resumes the suspended native closure; when no callback is configured it resolves with a no-op
  // so the Apple Pay sheet never hangs.
  const subscribeApplePayHandlers = useCallback(() => {
    AdyenContext.assignApplePayAuthorizationHandler((payment) => {
      const provide = (result: ApplePayAuthorizationResult) =>
        AdyenContext.provideAuthorizationResult(result);
      const actions: ApplePayAuthorizationActions = {
        resolve: () => provide({ status: 'success' }),
        reject: (errors) => provide({ status: 'failure', errors }),
      };
      const callback = configRef.current?.applepay?.onAuthorize;
      if (callback) {
        callback(payment, actions);
      } else {
        actions.resolve();
      }
    });
    AdyenContext.assignApplePayShippingContactHandler((contact) => {
      const resolve = (update: ApplePayShippingContactUpdateRequest) =>
        AdyenContext.provideShippingContactUpdate(update);
      const callback = configRef.current?.applepay?.onShippingContactChange;
      if (callback) {
        callback(contact, resolve);
      } else {
        resolve({});
      }
    });
    AdyenContext.assignApplePayShippingMethodHandler((shippingMethod) => {
      const resolve = (update: ApplePayShippingMethodUpdateRequest) =>
        AdyenContext.provideShippingMethodUpdate(update);
      const callback = configRef.current?.applepay?.onShippingMethodChange;
      if (callback) {
        callback(shippingMethod, resolve);
      } else {
        resolve({});
      }
    });
    AdyenContext.assignApplePayCouponCodeHandler((data) => {
      const resolve = (update: ApplePayCouponCodeUpdateRequest) =>
        AdyenContext.provideCouponCodeUpdate(update);
      const callback = configRef.current?.applepay?.onCouponCodeChange;
      if (callback) {
        callback(data.couponCode, resolve);
      } else {
        resolve({});
      }
    });
  }, []);

  const setup = useCallback(
    async (
      session: SessionConfiguration,
      configuration: Configuration,
      callbacks: SessionCallbacks
    ): Promise<Checkout> => {
      // Tear down any prior context so a re-setup never reuses stale native state.
      if (checkoutRef.current) {
        AdyenContext.cleanup();
      }
      configRef.current = configuration;
      checkConfiguration(configuration);
      setConfig(configuration);
      sessionCallbacksRef.current = callbacks;
      AdyenContext.removeAllListeners();
      AdyenContext.assignCompletionHandler((result) =>
        sessionCallbacksRef.current?.onComplete(result, createResultHandler())
      );
      AdyenContext.assignErrorHandler((error) =>
        sessionCallbacksRef.current?.onError(error, createResultHandler())
      );
      subscribeApplePayHandlers();

      const context = await AdyenContext.createSession(
        { id: session.id, sessionData: session.sessionData },
        configuration
      );
      const created = createCheckout(context.paymentMethods);
      checkoutRef.current = created;
      setCheckout(created);
      return created;
    },
    [subscribeApplePayHandlers]
  );

  const setupAdvanced = useCallback(
    async (
      paymentMethods: PaymentMethodsResponse,
      configuration: Configuration,
      callbacks: AdvancedCallbacks
    ): Promise<Checkout> => {
      // Tear down any prior context so a re-setup never reuses stale native state.
      if (checkoutRef.current) {
        AdyenContext.cleanup();
      }
      configRef.current = configuration;
      checkConfiguration(configuration);
      setConfig(configuration);
      advancedCallbacksRef.current = callbacks;
      AdyenContext.removeAllListeners();
      AdyenContext.assignSubmitHandler(({ paymentData }) => {
        const payload = {
          ...paymentData,
          returnUrl: paymentData.returnUrl ?? configuration.returnUrl,
        };
        advancedCallbacksRef.current?.onSubmit(payload, createSubmitHandler());
      });
      AdyenContext.assignAdditionalDetailsHandler((data) =>
        advancedCallbacksRef.current?.onAdditionalDetails(
          data,
          createResultHandler()
        )
      );
      AdyenContext.assignAdvancedErrorHandler((error) =>
        advancedCallbacksRef.current?.onError(error, createResultHandler())
      );
      subscribeApplePayHandlers();

      await AdyenContext.setup(paymentMethods, configuration);
      const created = createCheckout(paymentMethods);
      checkoutRef.current = created;
      setCheckout(created);
      return created;
    },
    [subscribeApplePayHandlers]
  );

  const contextValue = useMemo<AdyenCheckoutContextType>(
    () => ({ setup, setupAdvanced, checkout }),
    [setup, setupAdvanced, checkout]
  );

  const componentContextValue = useMemo<AdyenComponentContextType>(
    () => ({ subscribe, unsubscribe, configuration: config }),
    [subscribe, unsubscribe, config]
  );

  return (
    <AdyenCheckoutContext.Provider value={contextValue}>
      <AdyenComponentContext.Provider value={componentContextValue}>
        {children}
      </AdyenComponentContext.Provider>
    </AdyenCheckoutContext.Provider>
  );
};
