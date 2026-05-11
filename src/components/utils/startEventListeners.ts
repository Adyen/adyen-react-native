import { type EmitterSubscription, NativeEventEmitter } from 'react-native';
import type {
  AddressLookup,
  AddressLookupItem,
  AdyenActionComponent,
  AdyenError,
  ApplePayAuthorizationResultRequest,
  ApplePayPaymentAuthorization,
  Configuration,
  Order,
  PartialPaymentComponent,
  PaymentDetailsData,
  PaymentMethodData,
  SessionsResult,
  StoredPaymentMethod,
  SubmitModel,
} from '../../core';
import { Event } from '../../core';
import type { ApplePayModule } from '../../modules/applepay/AdyenApplePay';
import type { RemovesStoredPayment } from '../../modules/dropin/DropInWrapper';
import type { AdyenEventListener } from '../../modules/base/EventListenerWrapper';

export type EventHandlerRefs = {
  onSubmit: React.RefObject<
    | ((
        data: PaymentMethodData,
        component: AdyenActionComponent,
        extra?: any
      ) => void)
    | undefined
  >;
  onError: React.RefObject<
    (error: AdyenError, component: AdyenActionComponent) => void
  >;
  onComplete: React.RefObject<
    | ((result: SessionsResult, component: AdyenActionComponent) => void)
    | undefined
  >;
  onAdditionalDetails: React.RefObject<
    | ((data: PaymentDetailsData, component: AdyenActionComponent) => void)
    | undefined
  >;
  config: React.RefObject<Configuration>;
};

/**
 * Start event listeners on a native component.
 *
 * @param nativeComponent - The native wrapper used for event subscription.
 * @param refs - Callback refs for event handlers.
 * @param viewId - When set, events are filtered by `data.viewId` (embedded component mode).
 */
export function startEventListeners(
  nativeComponent: AdyenEventListener & AdyenActionComponent,
  refs: EventHandlerRefs,
  viewId?: string
): EmitterSubscription[] {
  const eventEmitter = new NativeEventEmitter(
    nativeComponent.eventEmitterTarget
  );
  const eventSubscriptions: EmitterSubscription[] = [];

  function subscribeIfSupported<T>(
    event: Event,
    handler: (data: T) => void
  ): void {
    if (nativeComponent.isSupported(event)) {
      eventSubscriptions.push(
        eventEmitter.addListener(event, (rawData: any) => {
          if (viewId) {
            if (rawData?.viewId !== viewId) return;
          }
          handler(rawData as T);
        })
      );
    }
  }

  function submitPayment(data: PaymentMethodData, extra: any) {
    const payload = {
      ...data,
      returnUrl: data.returnUrl ?? refs.config.current.returnUrl,
    };
    refs.onSubmit.current?.(payload, nativeComponent, extra);
  }

  // Core events
  subscribeIfSupported<SubmitModel>(Event.onSubmit, (response) =>
    submitPayment(response.paymentData, response.extra)
  );
  subscribeIfSupported<AdyenError>(Event.onError, (error) =>
    refs.onError.current?.(error, nativeComponent)
  );
  subscribeIfSupported<SessionsResult>(Event.onComplete, (data) =>
    refs.onComplete.current?.(data, nativeComponent)
  );
  subscribeIfSupported<PaymentDetailsData>(Event.onAdditionalDetails, (data) =>
    refs.onAdditionalDetails.current?.(data, nativeComponent)
  );

  // Address lookup
  const lookupModule = nativeComponent as unknown as AddressLookup;
  subscribeIfSupported(Event.onAddressUpdate, async (data: any) => {
    const prompt = viewId && typeof data === 'object' ? data.value : data;
    refs.config.current.card?.onUpdateAddress?.(prompt, lookupModule);
  });
  subscribeIfSupported(Event.onAddressConfirm, (address: AddressLookupItem) =>
    refs.config.current.card?.onConfirmAddress?.(address, lookupModule)
  );

  // BIN lookup and value
  subscribeIfSupported(Event.onBinLookup, (data: any) => {
    const lookupData =
      viewId && !Array.isArray(data) && typeof data === 'object'
        ? data.data
        : data;
    refs.config.current.card?.onBinLookup?.(lookupData);
  });

  subscribeIfSupported(Event.onBinValue, (data: any) => {
    const value = viewId && typeof data === 'object' ? data.value : data;
    refs.config.current.card?.onBinValue?.(value);
  });

  // Stored payment method removal (Drop-in only)
  const nativeModule = nativeComponent as unknown as RemovesStoredPayment;
  subscribeIfSupported<StoredPaymentMethod>(
    Event.onDisableStoredPaymentMethod,
    (data) =>
      refs.config.current.dropin?.onDisableStoredPaymentMethod?.(
        data,
        () => nativeModule.removeStored(true),
        () => nativeModule.removeStored(false)
      )
  );

  // Partial payments (Drop-in only)
  const partialComponent =
    nativeComponent as unknown as PartialPaymentComponent;
  subscribeIfSupported(
    Event.onCheckBalance,
    async (paymentData: PaymentMethodData) =>
      refs.config.current.partialPayment?.onBalanceCheck?.(
        paymentData,
        (balance) => partialComponent.provideBalance(true, balance, undefined),
        (error) => partialComponent.provideBalance(false, undefined, error)
      )
  );
  subscribeIfSupported(Event.onRequestOrder, () => {
    refs.config.current.partialPayment?.onOrderRequest?.(
      (order: Order) => partialComponent.provideOrder(true, order, undefined),
      (error: Error) => partialComponent.provideOrder(false, undefined, error)
    );
  });
  subscribeIfSupported(
    Event.onCancelOrder,
    ({ order, shouldUpdatePaymentMethods }: any) =>
      refs.config.current.partialPayment?.onOrderCancel?.(
        order,
        shouldUpdatePaymentMethods,
        partialComponent
      )
  );

  // Apple Pay — authorization callback
  const applePayModule = nativeComponent as unknown as ApplePayModule;
  subscribeIfSupported<ApplePayPaymentAuthorization>(
    Event.onApplePayAuthorization,
    (payment) => {
      const resolve = (result: ApplePayAuthorizationResultRequest) =>
        applePayModule.provideAuthorizationResult(result);
      const callback = refs.config.current.applepay?.onAuthorize;
      if (callback) {
        callback(payment, resolve);
      } else {
        resolve({ status: 'success' });
      }
    }
  );

  return eventSubscriptions;
}
