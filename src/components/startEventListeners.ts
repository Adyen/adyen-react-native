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
import type { PaymentComponentWrapper } from '../modules/base/PaymentComponentWrapper';

export type EventHandlerRefs = {
  onSubmit: React.MutableRefObject<
    | ((data: PaymentMethodData, component: AdyenActionComponent, extra?: any) => void)
    | undefined
  >;
  onError: React.MutableRefObject<(error: AdyenError, component: AdyenComponent) => void>;
  onComplete: React.MutableRefObject<
    ((result: SessionsResult, component: AdyenComponent) => void) | undefined
  >;
  onAdditionalDetails: React.MutableRefObject<
    ((data: PaymentDetailsData, component: AdyenActionComponent) => void) | undefined
  >;
  config: React.MutableRefObject<Configuration>;
};

export function startEventListeners(
  nativeComponent: PaymentComponentWrapper & AdyenActionComponent,
  refs: EventHandlerRefs
): EmitterSubscription[] {
  const eventEmitter = new NativeEventEmitter(nativeComponent.eventEmitterTarget);
  const eventSubscriptions: EmitterSubscription[] = [];

  function subscribeIfSupported<T>(event: Event, handler: (data: T) => void): void {
    if (nativeComponent.isSupported(event)) {
      eventSubscriptions.push(eventEmitter.addListener(event, handler));
    }
  }

  const configuration = refs.config.current;

  function submitPayment(data: PaymentMethodData, extra: any) {
    const payload = {
      ...data,
      returnUrl: data.returnUrl ?? configuration.returnUrl,
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

  // Stored payment method removal
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

  // Address lookup
  const onUpdateAddressCallback = configuration.card?.onUpdateAddress;
  const onConfirmAddressCallback = configuration.card?.onConfirmAddress;
  if (onUpdateAddressCallback && onConfirmAddressCallback) {
    const nativeModule = nativeComponent as unknown as AddressLookup;
    subscribeIfSupported(Event.onAddressUpdate, async (prompt: string) =>
      onUpdateAddressCallback(prompt, nativeModule)
    );
    subscribeIfSupported(Event.onAddressConfirm, (address: AddressLookupItem) =>
      onConfirmAddressCallback(address, nativeModule)
    );
  }

  // Partial payments
  const onBalanceCheckCallback = configuration.partialPayment?.onBalanceCheck;
  const onOrderRequestCallback = configuration.partialPayment?.onOrderRequest;
  const onOrderCancelCallback = configuration.partialPayment?.onOrderCancel;
  if (onBalanceCheckCallback && onOrderRequestCallback && onOrderCancelCallback) {
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
  const onBinLookupCallback = configuration.card?.onBinLookup;
  if (onBinLookupCallback) {
    subscribeIfSupported(Event.onBinLookup, onBinLookupCallback);
  }

  const onBinValueCallback = configuration.card?.onBinValue;
  if (onBinValueCallback) {
    subscribeIfSupported(Event.onBinValue, onBinValueCallback);
  }

  return eventSubscriptions;
}
