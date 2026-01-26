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
    };
  }, []);

  useEffect(() => {
    if (session && !sessionContext) {
      SessionHelper.removeAllListeners();
      SessionHelper.createSession(session, config)
        .then((sessionResponse) => {
          setSessionContext(sessionResponse);
        })
        .catch((error) => {
          onError(
            {
              message: String(error),
              errorCode: ErrorCode.sessionError,
            },
            SessionHelper
          );
        });
      SessionHelper.onComplete((result) => {
        onComplete?.(result, SessionHelper);
      });
      SessionHelper.onError((error) => {
        onError?.(error, SessionHelper);
      });
    }
  }, [session, sessionContext, config, onComplete, onError, setSessionContext]);

  const startEventListeners = useCallback(
    (nativeComponent: PaymentComponentWrapper & AdyenActionComponent) => {
      removeEventListeners();
      const eventEmitter = new NativeEventEmitter(nativeComponent);

      function submitPayment(data: PaymentMethodData, extra: any) {
        const payload = {
          ...data,
          returnUrl: data.returnUrl ?? config.returnUrl,
        };
        onSubmit?.(payload, nativeComponent, extra);
      }

      subscriptions.current = [
        eventEmitter.addListener(Event.onSubmit, (response: SubmitModel) =>
          submitPayment(response.paymentData, response.extra)
        ),
        eventEmitter.addListener(Event.onError, (error: AdyenError) =>
          onError?.(error, nativeComponent)
        ),
      ];

      if (nativeComponent.isSupported(Event.onComplete)) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onComplete, (data: any) =>
            onComplete?.(data, nativeComponent)
          )
        );
      }

      if (nativeComponent.isSupported(Event.onAdditionalDetails)) {
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onAdditionalDetails,
            (data: PaymentDetailsData) =>
              onAdditionalDetails?.(data, nativeComponent)
          )
        );
      }

      const onDisableStoredPaymentMethodCallback =
        config.dropin?.onDisableStoredPaymentMethod;
      if (
        onDisableStoredPaymentMethodCallback &&
        nativeComponent.isSupported(Event.onDisableStoredPaymentMethod)
      ) {
        const nativeModule = nativeComponent as unknown as RemovesStoredPayment;
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onDisableStoredPaymentMethod,
            (data: StoredPaymentMethod) =>
              onDisableStoredPaymentMethodCallback(
                data,
                () => {
                  nativeModule.removeStored(true);
                },
                () => {
                  nativeModule.removeStored(false);
                }
              )
          )
        );
      }

      const onUpdateAddressCallback = config.card?.onUpdateAddress;
      const onConfirmAddressCallback = config.card?.onConfirmAddress;
      if (
        onUpdateAddressCallback &&
        onConfirmAddressCallback &&
        nativeComponent.isSupported(Event.onAddressUpdate) &&
        nativeComponent.isSupported(Event.onAddressConfirm)
      ) {
        const nativeModule = nativeComponent as unknown as AddressLookup;
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onAddressUpdate,
            async (prompt: string) => {
              onUpdateAddressCallback(prompt, nativeModule);
            }
          ),
          eventEmitter.addListener(
            Event.onAddressConfirm,
            (address: AddressLookupItem) => {
              onConfirmAddressCallback(address, nativeModule);
            }
          )
        );
      }

      const onBalanceCheckCallback = config.partialPayment?.onBalanceCheck;
      const onOrderRequestCallback = config.partialPayment?.onOrderRequest;
      const onOrderCancelCallback = config.partialPayment?.onOrderCancel;
      if (
        onBalanceCheckCallback &&
        onOrderRequestCallback &&
        onOrderCancelCallback &&
        nativeComponent.isSupported(Event.onCheckBalance) &&
        nativeComponent.isSupported(Event.onRequestOrder) &&
        nativeComponent.isSupported(Event.onCancelOrder)
      ) {
        const component = nativeComponent as unknown as PartialPaymentComponent;
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onCheckBalance,
            async (paymentData) => {
              onBalanceCheckCallback(
                paymentData,
                (balance) => {
                  component.provideBalance(true, balance, undefined);
                },
                (error: Error) => {
                  component.provideBalance(false, undefined, error);
                }
              );
            }
          ),
          eventEmitter.addListener(Event.onRequestOrder, () => {
            onOrderRequestCallback(
              (order: Order) => {
                component.provideOrder(true, order, undefined);
              },
              (error: Error) => {
                component.provideOrder(false, undefined, error);
              }
            );
          }),
          eventEmitter.addListener(
            Event.onCancelOrder,
            ({ order, shouldUpdatePaymentMethods }) => {
              onOrderCancelCallback(
                order,
                shouldUpdatePaymentMethods,
                component
              );
            }
          )
        );
      }

      const onBinLookupCallback = config.card?.onBinLookup;
      if (
        onBinLookupCallback &&
        nativeComponent.isSupported(Event.onBinLookup)
      ) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onBinLookup, onBinLookupCallback)
        );
      }

      const onBinValueCallback = config.card?.onBinValue;
      if (onBinValueCallback && nativeComponent.isSupported(Event.onBinValue)) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onBinValue, onBinValueCallback)
        );
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
