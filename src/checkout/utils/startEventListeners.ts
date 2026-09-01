import { type EmitterSubscription, NativeEventEmitter } from 'react-native';
import type {
  AddressLookup,
  AddressLookupItem,
  AdditionalDetailsResult,
  AdyenError,
  ApplePayAuthorizationActions,
  ApplePayAuthorizationResult,
  ApplePayCouponCodeEvent,
  ApplePayCouponCodeUpdateRequest,
  ApplePayPaymentAuthorization,
  ApplePayPaymentContact,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethod,
  ApplePayShippingMethodUpdateRequest,
  Configuration,
  Order,
  PartialPaymentComponent,
  PaymentDetailsData,
  PaymentMethodData,
  StoredPaymentMethod,
  SubmitModel,
  SubmitResult,
} from '../../core';
import { Event } from '../../core';
import type { RemovesStoredPayment } from '../../modules/dropin/DropInWrapper';
import type { AdyenEventListener } from '../../modules/base/EventListenerWrapper';

/** Apple Pay delegate callbacks the native component exposes for JS to resolve. */
interface ApplePayCallbackHandler {
  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void;
  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void;
  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void;
  provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}

export type EventHandlerRefs = {
  onSubmit: {
    current:
      | ((data: PaymentMethodData) => Promise<SubmitResult> | undefined)
      | undefined;
  };
  onError: {
    current: ((error: AdyenError) => void) | undefined;
  };
  onComplete: {
    current: ((result: any) => void) | undefined;
  };
  onAdditionalDetails: {
    current:
      | ((
          data: PaymentDetailsData
        ) => Promise<AdditionalDetailsResult> | undefined)
      | undefined;
  };
  config: { current: Configuration | null };
};

/** A native wrapper that can be subscribed to and can dispatch results back. */
export type EventListenerTarget = AdyenEventListener & NativeResultDispatcher;

/** Methods the native component exposes for dispatching submit/details results. */
interface NativeResultDispatcher {
  action(action: any): void;
  completion(resultCode: string): void;
  retry(message?: string): void;
}

/**
 * Groups of related events a caller can subscribe to independently.
 *
 * Which presenter owns which family differs. An embedded view owns everything it can emit, while
 * Drop-in owns its own families but shares `core` with the context listeners, which route by
 * presenter tag. Subscribing `core` from both would run merchant callbacks twice.
 */
export type ListenerFamily =
  'core' | 'card' | 'addressLookup' | 'dropIn' | 'applePay';

const ALL_FAMILIES: readonly ListenerFamily[] = [
  'core',
  'card',
  'addressLookup',
  'dropIn',
  'applePay',
];

/** Families Drop-in owns exclusively. `core` is deliberately absent - see {@link ListenerFamily}. */
const DROP_IN_FAMILIES: readonly ListenerFamily[] = [
  'card',
  'addressLookup',
  'dropIn',
];

/**
 * Subscribes the event families Drop-in owns.
 *
 * Stored-payment removal, partial payments and address lookup previously had no listener at all
 * outside embedded views, because `startEventListeners` was only ever called per `viewId`. Without
 * these the matching Drop-in configuration callbacks never fire.
 *
 * @param nativeComponent - The Drop-in wrapper.
 * @param refs - Callback refs for event handlers.
 */
export function startDropInEventListeners(
  nativeComponent: EventListenerTarget,
  refs: EventHandlerRefs
): EmitterSubscription[] {
  return startEventListeners(
    nativeComponent,
    refs,
    undefined,
    DROP_IN_FAMILIES
  );
}

/**
 * Start event listeners on a native component.
 *
 * @param nativeComponent - The native wrapper used for event subscription.
 * @param refs - Callback refs for event handlers.
 * @param viewId - When set, events are filtered by `data.viewId` (embedded component mode).
 * @param families - Which event families to subscribe. Defaults to all of them.
 */
export function startEventListeners(
  nativeComponent: EventListenerTarget,
  refs: EventHandlerRefs,
  viewId?: string,
  families: readonly ListenerFamily[] = ALL_FAMILIES
): EmitterSubscription[] {
  const eventEmitter = new NativeEventEmitter(
    nativeComponent.eventEmitterTarget
  );
  const eventSubscriptions: EmitterSubscription[] = [];

  function subscribeIfSupported<T>(
    family: ListenerFamily,
    event: Event,
    handler: (data: T) => void
  ): void {
    if (!families.includes(family)) return;
    if (nativeComponent.isSupported(event)) {
      eventSubscriptions.push(
        eventEmitter.addListener(event, (rawData: any) => {
          // Attribution rule, both halves: a listener bound to a view takes only that view's
          // events, and a listener not bound to a view takes only events no view produced.
          // Without the second half a non-view listener would also see every embedded view's
          // events, because event names are global on both platforms.
          if (viewId) {
            if (rawData?.viewId !== viewId) return;
          } else if (rawData?.viewId !== undefined) {
            return;
          }
          handler(rawData as T);
        })
      );
    }
  }

  async function submitPayment(data: PaymentMethodData) {
    const payload = {
      ...data,
      returnUrl: data.returnUrl ?? refs.config.current?.returnUrl,
    };
    const result = await refs.onSubmit.current?.(payload);
    if (result) {
      switch (result.type) {
        case 'action':
          nativeComponent.action(result.action);
          break;
        case 'completed':
          nativeComponent.completion(result.resultCode);
          break;
        case 'retry':
          nativeComponent.retry(result.message);
          break;
      }
    }
  }

  // Core events
  subscribeIfSupported<SubmitModel>('core', Event.onSubmit, (response) =>
    submitPayment(response.paymentData)
  );
  subscribeIfSupported<AdyenError>('core', Event.onError, (error) =>
    refs.onError.current?.(error)
  );
  subscribeIfSupported('core', Event.onComplete, (data) =>
    refs.onComplete.current?.(data)
  );
  subscribeIfSupported<PaymentDetailsData>(
    'core',
    Event.onAdditionalDetails,
    async (data) => {
      const result = await refs.onAdditionalDetails.current?.(data);
      if (result) {
        nativeComponent.completion(result.resultCode);
      }
    }
  );

  // Address lookup
  const lookupModule = nativeComponent as unknown as AddressLookup;
  subscribeIfSupported(
    'addressLookup',
    Event.onAddressUpdate,
    async (data: any) => {
      const prompt = viewId && typeof data === 'object' ? data.value : data;
      refs.config.current?.card?.onUpdateAddress?.(prompt, lookupModule);
    }
  );
  subscribeIfSupported(
    'addressLookup',
    Event.onAddressConfirm,
    (address: AddressLookupItem) =>
      refs.config.current?.card?.onConfirmAddress?.(address, lookupModule)
  );

  // BIN lookup and value
  subscribeIfSupported('card', Event.onBinLookup, (data: any) => {
    const lookupData =
      viewId && !Array.isArray(data) && typeof data === 'object'
        ? data.data
        : data;
    refs.config.current?.card?.onBinLookup?.(lookupData);
  });

  subscribeIfSupported('card', Event.onBinValue, (data: any) => {
    const value = viewId && typeof data === 'object' ? data.value : data;
    refs.config.current?.card?.onBinValue?.(value);
  });

  // Stored payment method removal (Drop-in only)
  const nativeModule = nativeComponent as unknown as RemovesStoredPayment;
  subscribeIfSupported<StoredPaymentMethod>(
    'dropIn',
    Event.onDisableStoredPaymentMethod,
    (data) =>
      refs.config.current?.dropin?.onDisableStoredPaymentMethod?.(
        data,
        () => nativeModule.removeStored(true),
        () => nativeModule.removeStored(false)
      )
  );

  // Partial payments (Drop-in only)
  const partialComponent =
    nativeComponent as unknown as PartialPaymentComponent;
  subscribeIfSupported(
    'dropIn',
    Event.onCheckBalance,
    async (paymentData: PaymentMethodData) =>
      refs.config.current?.partialPayment?.onBalanceCheck?.(
        paymentData,
        (balance) => partialComponent.provideBalance(true, balance, undefined),
        (error) => partialComponent.provideBalance(false, undefined, error)
      )
  );
  subscribeIfSupported('dropIn', Event.onRequestOrder, () => {
    refs.config.current?.partialPayment?.onOrderRequest?.(
      (order: Order) => partialComponent.provideOrder(true, order, undefined),
      (error: Error) => partialComponent.provideOrder(false, undefined, error)
    );
  });
  subscribeIfSupported(
    'dropIn',
    Event.onCancelOrder,
    ({ order, shouldUpdatePaymentMethods }: any) =>
      refs.config.current?.partialPayment?.onOrderCancel?.(
        order,
        shouldUpdatePaymentMethods,
        partialComponent
      )
  );

  // Apple Pay delegate callbacks
  const applePayModule = nativeComponent as unknown as ApplePayCallbackHandler;

  subscribeIfSupported<ApplePayCouponCodeEvent>(
    'applePay',
    Event.onApplePayCouponCodeChange,
    (data) => {
      const resolve = (update: ApplePayCouponCodeUpdateRequest) =>
        applePayModule.provideCouponCodeUpdate(update);
      const callback = refs.config.current?.applepay?.onCouponCodeChange;
      if (callback) {
        callback(data.couponCode, resolve);
      } else {
        resolve({});
      }
    }
  );

  subscribeIfSupported<ApplePayPaymentContact>(
    'applePay',
    Event.onApplePayShippingContactChange,
    (contact) => {
      const resolve = (update: ApplePayShippingContactUpdateRequest) =>
        applePayModule.provideShippingContactUpdate(update);
      const callback = refs.config.current?.applepay?.onShippingContactChange;
      if (callback) {
        callback(contact, resolve);
      } else {
        resolve({});
      }
    }
  );

  subscribeIfSupported<ApplePayShippingMethod>(
    'applePay',
    Event.onApplePayShippingMethodChange,
    (shippingMethod) => {
      const resolve = (update: ApplePayShippingMethodUpdateRequest) =>
        applePayModule.provideShippingMethodUpdate(update);
      const callback = refs.config.current?.applepay?.onShippingMethodChange;
      if (callback) {
        callback(shippingMethod, resolve);
      } else {
        resolve({});
      }
    }
  );

  // Apple Pay — authorization callback
  subscribeIfSupported<ApplePayPaymentAuthorization>(
    'applePay',
    Event.onApplePayAuthorization,
    (payment) => {
      const provide = (result: ApplePayAuthorizationResult) =>
        applePayModule.provideAuthorizationResult(result);
      const actions: ApplePayAuthorizationActions = {
        resolve: () => provide({ status: 'success' }),
        reject: (errors?) => provide({ status: 'failure', errors }),
      };
      const callback = refs.config.current?.applepay?.onAuthorize;
      if (callback) {
        callback(payment, actions);
      } else {
        actions.resolve();
      }
    }
  );

  return eventSubscriptions;
}
