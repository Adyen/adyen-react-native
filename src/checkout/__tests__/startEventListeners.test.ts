import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { Event } from '../../core';
import { SubmitResult } from '../../core';
import {
  startDropInEventListeners,
  startEventListeners,
} from '../utils/startEventListeners';

// --------------------------------------------------------------------------
// NativeEventEmitter mock — captures handlers so we can fire them manually
// --------------------------------------------------------------------------

const mockListeners = new Map<string, ((data: any) => void)[]>();

const mockAddListener = jest.fn(
  (event: string, handler: (data: any) => void) => {
    if (!mockListeners.has(event)) mockListeners.set(event, []);
    mockListeners.get(event)!.push(handler);
    return { remove: jest.fn() };
  }
);

jest.mock('react-native', () => ({
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: mockAddListener,
  })),
}));

function fire(event: Event, data: any = {}) {
  (mockListeners.get(event) ?? []).forEach((h) => h(data));
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function createComponent() {
  return {
    eventEmitterTarget: {},
    action: jest.fn(),
    completion: jest.fn(),
    retry: jest.fn(),
    provideShippingContactUpdate: jest.fn(),
    provideShippingMethodUpdate: jest.fn(),
    provideCouponCodeUpdate: jest.fn(),
    provideAuthorizationResult: jest.fn(),
    removeStored: jest.fn(),
    provideBalance: jest.fn(),
    provideOrder: jest.fn(),
  } as any;
}

function createRefs(applepay: any = {}, dropin: any = {}) {
  return {
    onSubmit: { current: jest.fn() },
    onError: { current: jest.fn() },
    onComplete: { current: jest.fn() },
    onAdditionalDetails: { current: jest.fn() },
    config: {
      current: {
        environment: 'test' as const,
        clientKey: 'test_key',
        returnUrl: 'app://checkout',
        applepay,
        dropin,
      },
    },
  } as any;
}

// --------------------------------------------------------------------------

describe('startEventListeners', () => {
  beforeEach(() => {
    mockListeners.clear();
    mockAddListener.mockClear();
  });

  // -------------------------------------------------------------------------
  // family scoping — the only gate, now that supportedEvents is gone
  // -------------------------------------------------------------------------

  test('subscribes every family by default', () => {
    const subs = startEventListeners(createComponent(), createRefs());
    expect(mockAddListener).toHaveBeenCalledTimes(subs.length);
    expect(subs.length).toBeGreaterThan(0);
  });

  test('subscribes nothing when no family is enabled', () => {
    const subs = startEventListeners(createComponent(), createRefs(), []);
    expect(mockAddListener).not.toHaveBeenCalled();
    expect(subs).toHaveLength(0);
  });

  test('returns one subscription per subscribed event', () => {
    const subs = startEventListeners(createComponent(), createRefs(), ['core']);
    // core = submit, additionalDetails, complete, error
    expect(subs).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // Core events — return-based dispatch
  // -------------------------------------------------------------------------

  test('onSubmit — calls onSubmit ref and dispatches action result to component', async () => {
    const refs = createRefs();
    const component = createComponent();
    const actionResult = SubmitResult.action({
      type: 'redirect',
      paymentMethodType: 'ideal',
    });
    refs.onSubmit.current.mockResolvedValue(actionResult);

    startEventListeners(component, refs);
    fire(Event.onSubmit, {
      paymentData: {
        returnUrl: 'app://checkout',
        paymentMethod: { type: 'scheme' },
      },
      extra: { network: 'visa' },
    });

    // Allow async dispatch to complete
    await new Promise((r) => setTimeout(r, 0));

    expect(refs.onSubmit.current).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: { type: 'scheme' } })
    );
    expect(component.action).toHaveBeenCalledWith({
      type: 'redirect',
      paymentMethodType: 'ideal',
    });
  });

  test('onSubmit — dispatches completed result to component', async () => {
    const refs = createRefs();
    const component = createComponent();
    refs.onSubmit.current.mockResolvedValue(
      SubmitResult.completed('Authorised')
    );

    startEventListeners(component, refs);
    fire(Event.onSubmit, {
      paymentData: { paymentMethod: { type: 'scheme' } },
      extra: null,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(component.completion).toHaveBeenCalledWith('Authorised');
  });

  test('onSubmit — dispatches retry result to component', async () => {
    const refs = createRefs();
    const component = createComponent();
    refs.onSubmit.current.mockResolvedValue(SubmitResult.retry('Try again'));

    startEventListeners(component, refs);
    fire(Event.onSubmit, {
      paymentData: { paymentMethod: { type: 'scheme' } },
      extra: null,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(component.retry).toHaveBeenCalledWith('Try again');
  });

  test('onSubmit — injects returnUrl from config when missing in payload', async () => {
    const refs = createRefs();
    const component = createComponent();
    refs.onSubmit.current.mockResolvedValue(
      SubmitResult.completed('Authorised')
    );

    startEventListeners(component, refs);
    fire(Event.onSubmit, {
      paymentData: { paymentMethod: { type: 'scheme' } },
      extra: null,
    });

    await new Promise((r) => setTimeout(r, 0));

    expect(refs.onSubmit.current).toHaveBeenCalledWith(
      expect.objectContaining({ returnUrl: 'app://checkout' })
    );
  });

  test('onError — calls onError ref', () => {
    const refs = createRefs();
    startEventListeners(createComponent(), refs);
    const error = { message: 'fail', errorCode: 'canceledByShopper' };
    fire(Event.onError, error);
    expect(refs.onError.current).toHaveBeenCalledWith(error);
  });

  test('onComplete — calls onComplete ref', () => {
    const refs = createRefs();
    startEventListeners(createComponent(), refs);
    const result = {
      sessionId: 'sid',
      sessionResult: 'sr',
      resultCode: 'Authorised',
      sessionData: 'sd',
    };
    fire(Event.onComplete, result);
    expect(refs.onComplete.current).toHaveBeenCalledWith(result);
  });

  test('onAdditionalDetails — calls ref and dispatches result to component', async () => {
    const refs = createRefs();
    const component = createComponent();
    refs.onAdditionalDetails.current.mockResolvedValue({
      resultCode: 'Authorised',
    });

    startEventListeners(component, refs);
    const data = { details: {}, paymentData: 'pd' };
    fire(Event.onAdditionalDetails, data);

    await new Promise((r) => setTimeout(r, 0));

    expect(refs.onAdditionalDetails.current).toHaveBeenCalledWith(data);
    expect(component.completion).toHaveBeenCalledWith('Authorised');
  });

  // -------------------------------------------------------------------------
  // delivery — no attribution to apply
  // -------------------------------------------------------------------------

  test('delivers every event to the listener', () => {
    // There is one listener set and one set of merchant callbacks, so nothing needs
    // filtering. Events used to carry a viewId and be routed by it, which existed only
    // because each embedded view had its own listeners.
    const refs = createRefs();
    startEventListeners(createComponent(), refs);
    fire(Event.onError, { message: 'err', errorCode: 'x' });
    expect(refs.onError.current).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Drop-in families
  // -------------------------------------------------------------------------

  test('startDropInEventListeners wires the families Drop-in owns', () => {
    const onDisableStoredPaymentMethod = jest.fn();
    const refs = createRefs({}, { onDisableStoredPaymentMethod });
    const component = createComponent();

    startDropInEventListeners(component, refs);
    fire(Event.onDisableStoredPaymentMethod, { id: 'stored-1' });

    // Previously subscribed nowhere: startEventListeners was only ever called per viewId.
    expect(onDisableStoredPaymentMethod).toHaveBeenCalled();
  });

  test('startDropInEventListeners does not subscribe core events', () => {
    const refs = createRefs();
    const component = createComponent();

    startDropInEventListeners(component, refs);
    fire(Event.onSubmit, { paymentData: {} });
    fire(Event.onError, { message: 'err', errorCode: 'x' });

    // Core events arrive on the context listeners and are routed by presenter tag. Subscribing
    // them here too would invoke the merchant callbacks a second time.
    expect(refs.onSubmit.current).not.toHaveBeenCalled();
    expect(refs.onError.current).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Apple Pay — onShippingContactChange
  // -------------------------------------------------------------------------

  test('onApplePayShippingContactChange — calls user callback when configured', () => {
    const onShippingContactChange = jest.fn();
    const component = createComponent();
    startEventListeners(component, createRefs({ onShippingContactChange }));

    const contact = { emailAddress: 'a@b.com' };
    fire(Event.onApplePayShippingContactChange, contact);

    expect(onShippingContactChange).toHaveBeenCalledWith(
      contact,
      expect.any(Function)
    );
  });

  test('onApplePayShippingContactChange — resolve calls provideShippingContactUpdate', () => {
    const component = createComponent();
    const onShippingContactChange = jest.fn((_contact: any, resolve: any) =>
      resolve({ paymentSummaryItems: [] })
    );
    startEventListeners(component, createRefs({ onShippingContactChange }));

    fire(Event.onApplePayShippingContactChange, {});

    expect(component.provideShippingContactUpdate).toHaveBeenCalledWith({
      paymentSummaryItems: [],
    });
  });

  test('onApplePayShippingContactChange — auto-resolves with {} when no callback', () => {
    const component = createComponent();
    startEventListeners(component, createRefs({}));

    fire(Event.onApplePayShippingContactChange, {});

    expect(component.provideShippingContactUpdate).toHaveBeenCalledWith({});
  });

  // -------------------------------------------------------------------------
  // Apple Pay — onShippingMethodChange
  // -------------------------------------------------------------------------

  test('onApplePayShippingMethodChange — calls user callback when configured', () => {
    const onShippingMethodChange = jest.fn();
    const component = createComponent();
    startEventListeners(component, createRefs({ onShippingMethodChange }));

    const method = { label: 'Express', amount: '15', identifier: 'express' };
    fire(Event.onApplePayShippingMethodChange, method);

    expect(onShippingMethodChange).toHaveBeenCalledWith(
      method,
      expect.any(Function)
    );
  });

  test('onApplePayShippingMethodChange — resolve calls provideShippingMethodUpdate', () => {
    const component = createComponent();
    const onShippingMethodChange = jest.fn((_method: any, resolve: any) =>
      resolve({ paymentSummaryItems: [] })
    );
    startEventListeners(component, createRefs({ onShippingMethodChange }));

    fire(Event.onApplePayShippingMethodChange, {});

    expect(component.provideShippingMethodUpdate).toHaveBeenCalledWith({
      paymentSummaryItems: [],
    });
  });

  test('onApplePayShippingMethodChange — auto-resolves with {} when no callback', () => {
    const component = createComponent();
    startEventListeners(component, createRefs({}));

    fire(Event.onApplePayShippingMethodChange, {});

    expect(component.provideShippingMethodUpdate).toHaveBeenCalledWith({});
  });

  // -------------------------------------------------------------------------
  // Apple Pay — onCouponCodeChange
  // -------------------------------------------------------------------------

  test('onApplePayCouponCodeChange — calls user callback with coupon code string', () => {
    const onCouponCodeChange = jest.fn();
    const component = createComponent();
    startEventListeners(component, createRefs({ onCouponCodeChange }));

    fire(Event.onApplePayCouponCodeChange, { couponCode: 'SAVE10' });

    expect(onCouponCodeChange).toHaveBeenCalledWith(
      'SAVE10',
      expect.any(Function)
    );
  });

  test('onApplePayCouponCodeChange — resolve calls provideCouponCodeUpdate', () => {
    const component = createComponent();
    const onCouponCodeChange = jest.fn((_code: any, resolve: any) =>
      resolve({ errors: [{ type: 'couponCode', message: 'Invalid' }] })
    );
    startEventListeners(component, createRefs({ onCouponCodeChange }));

    fire(Event.onApplePayCouponCodeChange, { couponCode: 'BADCODE' });

    expect(component.provideCouponCodeUpdate).toHaveBeenCalledWith({
      errors: [{ type: 'couponCode', message: 'Invalid' }],
    });
  });

  test('onApplePayCouponCodeChange — auto-resolves with {} when no callback', () => {
    const component = createComponent();
    startEventListeners(component, createRefs({}));

    fire(Event.onApplePayCouponCodeChange, { couponCode: 'CODE' });

    expect(component.provideCouponCodeUpdate).toHaveBeenCalledWith({});
  });

  // -------------------------------------------------------------------------
  // Apple Pay — onAuthorize
  // -------------------------------------------------------------------------

  test('onApplePayAuthorization — calls user callback with payment and actions', () => {
    const onAuthorize = jest.fn();
    const component = createComponent();
    startEventListeners(component, createRefs({ onAuthorize }));

    const payment = { billingContact: { emailAddress: 'a@b.com' } };
    fire(Event.onApplePayAuthorization, payment);

    expect(onAuthorize).toHaveBeenCalledWith(
      payment,
      expect.objectContaining({
        resolve: expect.any(Function),
        reject: expect.any(Function),
      })
    );
  });

  test('onApplePayAuthorization — actions.resolve() calls provideAuthorizationResult with success', () => {
    const component = createComponent();
    const onAuthorize = jest.fn((_payment: any, actions: any) =>
      actions.resolve()
    );
    startEventListeners(component, createRefs({ onAuthorize }));

    fire(Event.onApplePayAuthorization, {});

    expect(component.provideAuthorizationResult).toHaveBeenCalledWith({
      status: 'success',
    });
  });

  test('onApplePayAuthorization — actions.reject(errors) calls provideAuthorizationResult with failure', () => {
    const component = createComponent();
    const errors = [{ type: 'billingAddress', message: 'Bad address' }];
    const onAuthorize = jest.fn((_payment: any, actions: any) =>
      actions.reject(errors)
    );
    startEventListeners(component, createRefs({ onAuthorize }));

    fire(Event.onApplePayAuthorization, {});

    expect(component.provideAuthorizationResult).toHaveBeenCalledWith({
      status: 'failure',
      errors,
    });
  });

  test('onApplePayAuthorization — actions.reject() without errors passes undefined', () => {
    const component = createComponent();
    const onAuthorize = jest.fn((_payment: any, actions: any) =>
      actions.reject()
    );
    startEventListeners(component, createRefs({ onAuthorize }));

    fire(Event.onApplePayAuthorization, {});

    expect(component.provideAuthorizationResult).toHaveBeenCalledWith({
      status: 'failure',
      errors: undefined,
    });
  });

  test('onApplePayAuthorization — auto-resolves with success when no callback', () => {
    const component = createComponent();
    startEventListeners(component, createRefs({}));

    fire(Event.onApplePayAuthorization, {});

    expect(component.provideAuthorizationResult).toHaveBeenCalledWith({
      status: 'success',
    });
  });
});
