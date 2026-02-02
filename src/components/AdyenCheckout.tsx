import React, {
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  useState,
  useMemo,
} from 'react';
import { type EmitterSubscription, NativeEventEmitter } from 'react-native';
import type {
  AddressLookup,
  AddressLookupItem,
  AdyenActionComponent,
  AdyenComponent,
  AdyenError,
  Configuration,
  Order,
  PartialPaymentComponent,
  PaymentDetailsData,
  PaymentMethodData,
  PaymentMethodsResponse,
  SessionConfiguration,
  SessionsResult,
  StoredPaymentMethod,
  SubmitModel,
} from '../core';
import { Event, ErrorCode } from '../core';
import { AdyenCheckoutContext } from '../hooks/useAdyenCheckout';
import { getWrapper } from '../modules/base/getWrapper';
import { SessionHelper } from '../modules/session/SessionHelperModule';
import type { SessionContext } from '../modules/session/types';
import { checkConfiguration, checkPaymentMethodsResponse } from './utils';
import type { RemovesStoredPayment } from '../modules/dropin/DropInWrapper';
import type { PaymentComponentWrapper } from '../modules/base/PaymentComponentWrapper';

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
  const subscriptions = useRef<EmitterSubscription[]>([]);
  const [sessionContext, setSessionContext] = useState<
    SessionContext | undefined
  >(undefined);

  const currentPaymentMethods = useMemo<
    PaymentMethodsResponse | undefined
  >(() => {
    return paymentMethods ?? sessionContext?.paymentMethods;
  }, [paymentMethods, sessionContext]);

  function removeEventListeners() {
    subscriptions.current.forEach((s: EmitterSubscription) => s.remove());
  }

  useEffect(() => {
    return () => {
      removeEventListeners();
      SessionHelper.removeAllListeners();
      SessionHelper.hide(true);
    };
  }, []);

  useEffect(() => {
    SessionHelper.removeAllListeners();
    SessionHelper.onComplete((result) => onComplete?.(result, SessionHelper));
    SessionHelper.onError((error) => onError?.(error, SessionHelper));
    if (session && !sessionContext) {
      SessionHelper.createSession(session, config)
        .then((sessionResponse) => setSessionContext(sessionResponse))
        .catch((error) => {
          const errorDTO: AdyenError = {
            message: String(error),
            errorCode: ErrorCode.sessionError,
          };
          onError(errorDTO, SessionHelper);
        });
    }
  }, [session, sessionContext, config, onComplete, onError, setSessionContext]);

  const startEventListeners = useCallback(
    (nativeComponent: PaymentComponentWrapper & AdyenActionComponent) => {
      removeEventListeners();
      const eventEmitter = new NativeEventEmitter(
        nativeComponent.eventEmitterTarget
      );
      subscriptions.current = [];

      /** Subscribe to an event if supported by native module */
      function subscribeIfSupported<T>(
        event: Event,
        handler: (data: T) => void
      ): void {
        if (nativeComponent.isSupported(event)) {
          subscriptions.current.push(eventEmitter.addListener(event, handler));
        }
      }

      function submitPayment(data: PaymentMethodData, extra: any) {
        const payload = {
          ...data,
          returnUrl: data.returnUrl ?? config.returnUrl,
        };
        onSubmit?.(payload, nativeComponent, extra);
      }

      // Core events
      subscribeIfSupported<SubmitModel>(Event.onSubmit, (response) =>
        submitPayment(response.paymentData, response.extra)
      );
      subscribeIfSupported<AdyenError>(Event.onError, (error) =>
        onError?.(error, nativeComponent)
      );
      subscribeIfSupported<SessionsResult>(Event.onComplete, (data) =>
        onComplete?.(data, nativeComponent)
      );
      subscribeIfSupported<PaymentDetailsData>(
        Event.onAdditionalDetails,
        (data) => onAdditionalDetails?.(data, nativeComponent)
      );

      // Stored payment method removal
      const onDisableStoredPaymentMethodCallback =
        config.dropin?.onDisableStoredPaymentMethod;
      if (onDisableStoredPaymentMethodCallback) {
        const nativeModule = nativeComponent as unknown as RemovesStoredPayment;
        subscribeIfSupported<StoredPaymentMethod>(
          Event.onDisableStoredPaymentMethod,
          (data) =>
            onDisableStoredPaymentMethodCallback(
              data,
              () => nativeModule.removeStored(true),
              () => nativeModule.removeStored(false)
            )
        );
      }

      // Address lookup
      const onUpdateAddressCallback = config.card?.onUpdateAddress;
      const onConfirmAddressCallback = config.card?.onConfirmAddress;
      if (onUpdateAddressCallback && onConfirmAddressCallback) {
        const nativeModule = nativeComponent as unknown as AddressLookup;
        subscribeIfSupported(Event.onAddressUpdate, async (prompt: string) =>
          onUpdateAddressCallback(prompt, nativeModule)
        );
        subscribeIfSupported(
          Event.onAddressConfirm,
          (address: AddressLookupItem) =>
            onConfirmAddressCallback(address, nativeModule)
        );
      }

      // Partial payments
      const onBalanceCheckCallback = config.partialPayment?.onBalanceCheck;
      const onOrderRequestCallback = config.partialPayment?.onOrderRequest;
      const onOrderCancelCallback = config.partialPayment?.onOrderCancel;
      if (
        onBalanceCheckCallback &&
        onOrderRequestCallback &&
        onOrderCancelCallback
      ) {
        const component = nativeComponent as unknown as PartialPaymentComponent;
        subscribeIfSupported(
          Event.onCheckBalance,
          async (paymentData: PaymentMethodData) =>
            onBalanceCheckCallback(
              paymentData,
              (balance) => component.provideBalance(true, balance, undefined),
              (error) => component.provideBalance(false, undefined, error)
            )
        );
        subscribeIfSupported(Event.onRequestOrder, () => {
          onOrderRequestCallback(
            (order: Order) => component.provideOrder(true, order, undefined),
            (error: Error) => component.provideOrder(false, undefined, error)
          );
        });
        subscribeIfSupported(
          Event.onCancelOrder,
          ({ order, shouldUpdatePaymentMethods }: any) =>
            onOrderCancelCallback(order, shouldUpdatePaymentMethods, component)
        );
      }

      // BIN lookup and value
      const onBinLookupCallback = config.card?.onBinLookup;
      if (onBinLookupCallback) {
        subscribeIfSupported(Event.onBinLookup, onBinLookupCallback);
      }

      const onBinValueCallback = config.card?.onBinValue;
      if (onBinValueCallback) {
        subscribeIfSupported(Event.onBinValue, onBinValueCallback);
      }
    },
    [onSubmit, onAdditionalDetails, onComplete, onError, config]
  );

  const start = useCallback(
    (typeName: string) => {
      const validPaymentMethods = checkPaymentMethodsResponse(
        currentPaymentMethods
      );

      const { nativeComponent, paymentMethod } = getWrapper(
        typeName,
        validPaymentMethods
      );

      checkConfiguration(config);
      startEventListeners(nativeComponent);

      if (paymentMethod) {
        const singlePaymentMethods = { paymentMethods: [paymentMethod] };
        const singlePaymentConfig = {
          ...config,
          dropin: { skipListWhenSinglePaymentMethod: true },
        };
        nativeComponent.open(singlePaymentMethods, singlePaymentConfig);
      } else {
        nativeComponent.open(validPaymentMethods, config);
      }
    },
    [config, currentPaymentMethods, startEventListeners]
  );

  return (
    <AdyenCheckoutContext.Provider
      value={{
        start,
        config,
        paymentMethods: currentPaymentMethods,
        isReady: currentPaymentMethods !== undefined,
      }}
    >
      {children}
    </AdyenCheckoutContext.Provider>
  );
};
