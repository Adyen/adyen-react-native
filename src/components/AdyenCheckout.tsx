import React, {
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  useState,
} from 'react';
import {
  type EmitterSubscription,
  NativeEventEmitter,
  type NativeModule,
} from 'react-native';
import { Event } from '../core/constants';
import type { AdyenComponent } from '../core/AdyenNativeModules';
import { SessionHelper } from '../modules/SessionHelperModule';
import { getWrapper } from '../wrappers/getWrapper';
import type {
  AdyenError,
  PaymentMethodsResponse,
  SessionConfiguration,
  SessionResponse,
  PaymentMethodData,
  PaymentDetailsData,
  StoredPaymentMethod,
  SubmitModel,
  Order,
} from '../core/types';
import type { Configuration } from '../core/configurations/Configuration';
import { checkPaymentMethodsResponse, checkConfiguration } from '../core/utils';
import type { AddressLookup } from '../wrappers/AddressLookupComponentWrapper';
import type { AdyenActionComponent } from '../core/AdyenNativeModules';
import type { RemovesStoredPayment } from '../wrappers/RemoveStoredPaymentComponentWrapper';
import type { AddressLookupItem } from '../core/configurations/AddressLookup';
import type { PartialPaymentComponent } from '../wrappers/PartialPaymentsComponentWrapper';
import { AdyenCheckoutContext } from '../hooks/useAdyenCheckout';

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
   * Event callback, called when a shopper finishes the flow (Voucher payments only).
   * @param component - The Adyen payment component.
   */
  onComplete?: (result: string, component: AdyenComponent) => void;
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
  const [sessionStorage, setSession] = useState<SessionResponse | undefined>(
    undefined
  );

  function removeEventListeners() {
    subscriptions.current.forEach((s: EmitterSubscription) => s.remove());
  }

  useEffect(() => {
    return () => {
      removeEventListeners();
    };
  }, []);

  useEffect(() => {
    function createSession(newSession: SessionConfiguration) {
      SessionHelper.createSession(newSession, config)
        .then((sessionResponse) => {
          setSession(sessionResponse);
        })
        .catch((error) => {
          onError(
            {
              message: String(error),
              errorCode: 'sessionError',
            },
            SessionHelper
          );
        });
    }

    if (session) {
      createSession(session);
    }
  }, [session, config, onError]);

  const startEventListeners = useCallback(
    (nativeComponent: AdyenActionComponent & NativeModule) => {
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

      if (nativeComponent.events.includes(Event.onComplete)) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onComplete, (data: any) =>
            onComplete?.(data, nativeComponent)
          )
        );
      }

      if (nativeComponent.events.includes(Event.onAdditionalDetails)) {
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
        nativeComponent.events.includes(Event.onDisableStoredPaymentMethod)
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
        nativeComponent.events.includes(Event.onAddressUpdate) &&
        nativeComponent.events.includes(Event.onAddressConfirm)
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
        nativeComponent.events.includes(Event.onCheckBalance) &&
        nativeComponent.events.includes(Event.onRequestOrder) &&
        nativeComponent.events.includes(Event.onCancelOrder)
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
        nativeComponent.events.includes(Event.onBinLookuop)
      ) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onBinLookuop, onBinLookupCallback)
        );
      }

      const onBinValueCallback = config.card?.onBinValue;
      if (
        onBinValueCallback &&
        nativeComponent.events.includes(Event.onBinValue)
      ) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onBinValue, onBinValueCallback)
        );
      }
    },
    [onSubmit, onAdditionalDetails, onComplete, onError, config]
  );

  const start = useCallback(
    (typeName: string) => {
      const currentPaymentMethods = checkPaymentMethodsResponse(
        paymentMethods ?? sessionStorage?.paymentMethods
      );

      const { nativeComponent, paymentMethod } = getWrapper(
        typeName,
        currentPaymentMethods
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
        nativeComponent.open(currentPaymentMethods, config);
      }
    },
    [config, paymentMethods, sessionStorage, startEventListeners]
  );

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
