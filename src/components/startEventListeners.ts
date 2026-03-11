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
  SessionsResult,
  StoredPaymentMethod,
  SubmitModel,
} from '../core';
import { Event } from '../core';
import type { RemovesStoredPayment } from '../modules/dropin/DropInWrapper';
import type { AdyenEventListener } from '../modules/base/EventListenerWrapper';

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
    (error: AdyenError, component: AdyenComponent) => void
  >;
  onComplete: React.RefObject<
    ((result: SessionsResult, component: AdyenComponent) => void) | undefined
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
 * @param nativeComponent - The native wrapper used for event subscription (isSupported, eventEmitterTarget).
 * @param refs - Callback refs for event handlers.
 * @param componentType - When set, events are filtered by `data.componentType` (embedded component mode).
 * @param callbackComponent - Component instance passed to merchant callbacks. Defaults to nativeComponent.
 */
export function startEventListeners(
  nativeComponent: AdyenEventListener & AdyenActionComponent,
  refs: EventHandlerRefs,
  componentType?: string,
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
          if (componentType) {
            if (rawData?.componentType !== componentType) return;
          }
          handler(rawData as T);
        })
      );
    }
  }

  const configuration = refs.config.current;

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
  const onUpdateAddressCallback = configuration.card?.onUpdateAddress;
  const onConfirmAddressCallback = configuration.card?.onConfirmAddress;
  if (onUpdateAddressCallback && onConfirmAddressCallback) {
    console.debug('Setting up address lookup listeners');
    const lookupModule = nativeComponent as unknown as AddressLookup;
    subscribeIfSupported(Event.onAddressUpdate, async (data: any) => {
      const prompt = componentType ? data.value : data;
      onUpdateAddressCallback(prompt, lookupModule);
    });
    subscribeIfSupported(Event.onAddressConfirm, (address: AddressLookupItem) =>
      onConfirmAddressCallback(address, lookupModule)
    );
  }

    // Stored payment method removal (Drop-in only)
  const onDisableStoredPaymentMethodCallback =
    configuration.dropin?.onDisableStoredPaymentMethod;
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

    // BIN lookup and value
  const onBinLookupCallback = configuration.card?.onBinLookup;
  if (onBinLookupCallback) {
    subscribeIfSupported(Event.onBinLookup, (data: any) => {
      const lookupData =
        componentType && !Array.isArray(data) ? data.data : data;
      onBinLookupCallback(lookupData);
    });
  }

  const onBinValueCallback = configuration.card?.onBinValue;
  if (onBinValueCallback) {
    subscribeIfSupported(Event.onBinValue, (data: any) => {
      const value =
        componentType && typeof data === 'object' ? data.value : data;
      onBinValueCallback(value);
    });
  }

  // Partial payments (Drop-in only)
  const onBalanceCheckCallback = configuration.partialPayment?.onBalanceCheck;
  const onOrderRequestCallback = configuration.partialPayment?.onOrderRequest;
  const onOrderCancelCallback = configuration.partialPayment?.onOrderCancel;
  if (
    onBalanceCheckCallback &&
    onOrderRequestCallback &&
    onOrderCancelCallback
  ) {
    const partialComponent =
      nativeComponent as unknown as PartialPaymentComponent;
    subscribeIfSupported(
      Event.onCheckBalance,
      async (paymentData: PaymentMethodData) =>
        onBalanceCheckCallback(
          paymentData,
          (balance) =>
            partialComponent.provideBalance(true, balance, undefined),
          (error) => partialComponent.provideBalance(false, undefined, error)
        )
    );
    subscribeIfSupported(Event.onRequestOrder, () => {
      onOrderRequestCallback(
        (order: Order) => partialComponent.provideOrder(true, order, undefined),
        (error: Error) => partialComponent.provideOrder(false, undefined, error)
      );
    });
    subscribeIfSupported(
      Event.onCancelOrder,
      ({ order, shouldUpdatePaymentMethods }: any) =>
        onOrderCancelCallback(
          order,
          shouldUpdatePaymentMethods,
          partialComponent
        )
    );
  }

  return eventSubscriptions;
}
