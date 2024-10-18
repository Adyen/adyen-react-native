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
import { Event, MISSING_CONTEXT_ERROR } from './core/constants';
import { AdyenComponent } from './core/AdyenNativeModules';
import { SessionHelper } from './modules/SessionHelperModule';
import { getWrapper } from './wrappers/getWrapper';
import {
  AdyenError,
  PaymentMethodsResponse,
  SessionConfiguration,
  SessionResponse,
  PaymentMethodData,
  PaymentDetailsData,
  StoredPaymentMethod,
  SubmitModel,
} from './core/types';
import { Configuration } from './core/configurations/Configuration';
import { checkPaymentMethodsResponse, checkConfiguration } from './core/utils';
import {
  AddressLookup,
  isAddressLooker,
} from './wrappers/AddressLookupComponentWrapper';
import { isActionComponent } from './wrappers/ActionHandlingComponentWrapper';
import { AdyenActionComponent } from './core/AdyenNativeModules';
import {
  isRemovesStoredPaymentComponent,
  RemovesStoredPayment,
} from './wrappers/RemoveStoredPaymentComponentWrapper';
import { AddressLookupItem } from './core/configurations/AddressLookup';
import { isPartialPaymentsComponent, PartialPaymentComponent } from './wrappers/PartialPaymentsComponentWrapper';

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
  const [sessionStorage, setSession] = useState<SessionResponse | undefined>(
    undefined
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
      extra: any
    ) => {
      const payload = {
        ...data,
        returnUrl: data.returnUrl ?? configuration.returnUrl,
      };
      onSubmit?.(payload, nativeComponent, extra);
    },
    [onSubmit]
  );

  const removeEventListeners = useCallback(() => {
    subscriptions.current.forEach((s: EmitterSubscription) => s.remove());
  }, [subscriptions]);

  const startEventListeners = useCallback(
    (
      configuration: Configuration,
      nativeComponent: AdyenActionComponent & NativeModule
    ) => {
      const eventEmitter = new NativeEventEmitter(nativeComponent);
      subscriptions.current = [
        eventEmitter.addListener(Event.onSubmit, (response: SubmitModel) =>
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

      if (nativeComponent.events.includes(Event.onComplete)) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onComplete, (data: any) =>
            onComplete?.(data, nativeComponent)
          )
        );
      }

      if (isActionComponent(nativeComponent)) {
        const nativeModule = nativeComponent as unknown as AdyenActionComponent;
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onAdditionalDetails,
            (data: PaymentDetailsData) =>
              onAdditionalDetails?.(data, nativeModule)
          )
        );
      }

      if (isRemovesStoredPaymentComponent(nativeComponent)) {
        const nativeModule = nativeComponent as unknown as RemovesStoredPayment;
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onDisableStoredPaymentMethod,
            (data: StoredPaymentMethod) =>
              configuration.dropin?.onDisableStoredPaymentMethod?.(
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

      if (isAddressLooker(nativeComponent)) {
        const nativeModule = nativeComponent as unknown as AddressLookup;
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onAddressUpdate,
            async (prompt: string) => {
              configuration.card?.onUpdateAddress?.(prompt, nativeModule);
            }
          )
        );
        subscriptions.current.push(
          eventEmitter.addListener(
            Event.onAddressConfirm,
            (address: AddressLookupItem) => {
              configuration.card?.onConfirmAddress?.(address, nativeModule);
            }
          )
        );
      }

      if (isPartialPaymentsComponent(nativeComponent)) {
        subscriptions.current.push(
          eventEmitter.addListener(Event.onCheckBalance, async (paymentData) => {
            configuration.partialPayment?.onBalanceCheck?.(paymentData,
              (balance) => {
                (
                  nativeComponent as unknown as PartialPaymentComponent
                ).provideBalance(true, balance, undefined)
              },
              (error) => {
                console.debug("Balance error: " + JSON.stringify(error));
                (
                  nativeComponent as unknown as PartialPaymentComponent
                ).provideBalance(false, undefined, error)
              })
          })
        );
        subscriptions.current.push(
          eventEmitter.addListener(Event.onRequestOrder, () => {
            configuration.partialPayment?.onOrderRequest?.(
              (order) => {
                (
                  nativeComponent as unknown as PartialPaymentComponent
                ).provideOrder(true, order, undefined)
              },
              (error) => {
                console.debug("Order error: " + JSON.stringify(error));
                (
                  nativeComponent as unknown as PartialPaymentComponent
                ).provideOrder(false, undefined, error)
              })
          })
        );
        subscriptions.current.push(
          eventEmitter.addListener(Event.onCancelOrder, (order) => {
            configuration.partialPayment?.onOrderCancel?.(order)
          })
        );
      }
    },
    [submitPayment, onAdditionalDetails, onComplete, onError, subscriptions]
  );

  const start = useCallback(
    (typeName: string) => {
      removeEventListeners();
      const currentPaymentMethods = checkPaymentMethodsResponse(
        paymentMethods ?? sessionStorage?.paymentMethods
      );

      const { nativeComponent, paymentMethod } = getWrapper(
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
        nativeComponent.open(singlePaymentMethods, singlePaymentConfig);
      } else {
        nativeComponent.open(currentPaymentMethods, config);
      }
    },
    [
      config,
      paymentMethods,
      sessionStorage,
      startEventListeners,
      removeEventListeners,
    ]
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
          SessionHelper
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

export { AdyenCheckout, useAdyenCheckout };
export type { AdyenCheckoutContextType, AdyenCheckoutProps };
