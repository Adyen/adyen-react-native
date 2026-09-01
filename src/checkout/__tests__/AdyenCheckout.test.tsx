import { describe, expect, test, jest, beforeEach } from '@jest/globals';

type MockFunction = (...args: any[]) => any;

// Mock functions must be defined before jest.mock calls due to hoisting
const mockCreateSession = jest.fn<MockFunction>();
const mockSetup = jest.fn<MockFunction>();
const mockCleanup = jest.fn<MockFunction>();
const mockRemoveAllListeners = jest.fn<MockFunction>();
const mockAssignBeforeSubmitHandler = jest.fn<MockFunction>();
const mockProvideBeforeSubmitResult = jest.fn<MockFunction>();
const mockAssignCompletionHandler = jest.fn<MockFunction>();
const mockAssignErrorHandler = jest.fn<MockFunction>();
const mockAssignSubmitHandler = jest.fn<MockFunction>();
const mockAssignAdditionalDetailsHandler = jest.fn<MockFunction>();
const mockAssignAdvancedCompleteHandler = jest.fn<MockFunction>();
const mockAssignAdvancedErrorHandler = jest.fn<MockFunction>();
const mockAssignApplePayAuthorizationHandler = jest.fn<MockFunction>();
const mockAssignApplePayShippingContactHandler = jest.fn<MockFunction>();
const mockAssignApplePayShippingMethodHandler = jest.fn<MockFunction>();
const mockAssignApplePayCouponCodeHandler = jest.fn<MockFunction>();
const mockProvideAuthorizationResult = jest.fn<MockFunction>();
const mockProvideShippingContactUpdate = jest.fn<MockFunction>();
const mockProvideShippingMethodUpdate = jest.fn<MockFunction>();
const mockProvideCouponCodeUpdate = jest.fn<MockFunction>();

// The ComponentModule wrapper is constructed at import time; its ModuleMock
// backing throws on any property access, so it is stubbed here.
jest.mock('../../modules/component/AdyenComponentModule', () => ({
  AdyenComponent: {
    name: 'AdyenComponent',
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockDropInAction = jest.fn();
const mockDropInCompletion = jest.fn();
const mockDropInRetry = jest.fn();

const mockContextAction = jest.fn();
const mockContextCompletion = jest.fn();
const mockContextRetry = jest.fn();

jest.mock('../../modules/dropin/AdyenDropIn', () => ({
  AdyenDropIn: {
    action: (...args: any[]) => mockDropInAction(...args),
    completion: (...args: any[]) => mockDropInCompletion(...args),
    retry: (...args: any[]) => mockDropInRetry(...args),
    // Drop-in's own event families (stored payment, partial payments, address lookup) are
    // subscribed through this module, so it has to look like an event listener target.
    isSupported: () => false,
    eventEmitterTarget: {},
  },
}));

jest.mock('../../modules/context/ContextModule', () => ({
  AdyenContext: {
    createSession: (...args: any[]) => mockCreateSession(...args),
    setup: (...args: any[]) => mockSetup(...args),
    cleanup: (...args: any[]) => mockCleanup(...args),
    removeAllListeners: (...args: any[]) => mockRemoveAllListeners(...args),
    assignBeforeSubmitHandler: (handler: (data: any) => Promise<void>) =>
      mockAssignBeforeSubmitHandler(handler),
    provideBeforeSubmitResult: (...args: any[]) =>
      mockProvideBeforeSubmitResult(...args),
    assignCompletionHandler: (handler: (result: any) => void) =>
      mockAssignCompletionHandler(handler),
    assignErrorHandler: (handler: (error: any) => void) =>
      mockAssignErrorHandler(handler),
    assignSubmitHandler: (handler: (data: any) => Promise<void>) =>
      mockAssignSubmitHandler(handler),
    assignAdditionalDetailsHandler: (handler: (data: any) => Promise<void>) =>
      mockAssignAdditionalDetailsHandler(handler),
    assignAdvancedCompleteHandler: (handler: (result: any) => void) =>
      mockAssignAdvancedCompleteHandler(handler),
    assignAdvancedErrorHandler: (handler: (error: any) => void) =>
      mockAssignAdvancedErrorHandler(handler),
    assignApplePayAuthorizationHandler: (handler: (data: any) => void) =>
      mockAssignApplePayAuthorizationHandler(handler),
    assignApplePayShippingContactHandler: (handler: (data: any) => void) =>
      mockAssignApplePayShippingContactHandler(handler),
    assignApplePayShippingMethodHandler: (handler: (data: any) => void) =>
      mockAssignApplePayShippingMethodHandler(handler),
    assignApplePayCouponCodeHandler: (handler: (data: any) => void) =>
      mockAssignApplePayCouponCodeHandler(handler),
    provideAuthorizationResult: (...args: any[]) =>
      mockProvideAuthorizationResult(...args),
    provideShippingContactUpdate: (...args: any[]) =>
      mockProvideShippingContactUpdate(...args),
    provideShippingMethodUpdate: (...args: any[]) =>
      mockProvideShippingMethodUpdate(...args),
    provideCouponCodeUpdate: (...args: any[]) =>
      mockProvideCouponCodeUpdate(...args),
    isAvailable: jest.fn(),
    requiresUserInteraction: jest.fn(),
    submit: jest.fn(),
    completion: (...args: any[]) => mockContextCompletion(...args),
    action: (...args: any[]) => mockContextAction(...args),
    retry: (...args: any[]) => mockContextRetry(...args),
  },
}));

import { AdyenCheckout } from '..';
import { SubmitResult } from '../../core';

// Test data
const mockConfig = {
  environment: 'test' as const,
  clientKey: 'test_ABCDEFGH',
  countryCode: 'NL',
  returnUrl: 'myapp://checkout',
};

const mockPaymentMethods = {
  paymentMethods: [
    { type: 'scheme', name: 'Credit Card' },
    { type: 'ideal', name: 'iDEAL' },
  ],
};

const sessionCallbacks = {
  onComplete: jest.fn<MockFunction>(),
  onError: jest.fn<MockFunction>(),
};

const advancedCallbacks = {
  onSubmit: jest.fn<MockFunction>(),
  onAdditionalDetails: jest.fn<MockFunction>(),
  onComplete: jest.fn<MockFunction>(),
  onError: jest.fn<MockFunction>(),
};

describe('AdyenCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSession.mockResolvedValue({ paymentMethods: mockPaymentMethods });
    mockSetup.mockResolvedValue(undefined);
    // Ensure a clean state for each test (cleanup is private; access via cast for testing)
    (AdyenCheckout as any).cleanup();
    jest.clearAllMocks();
  });

  describe('setup (sessions flow)', () => {
    test('creates the session, registers listeners and resolves checkout', async () => {
      const checkout = await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(mockCreateSession).toHaveBeenCalledWith(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig
      );
      expect(mockAssignCompletionHandler).toHaveBeenCalled();
      expect(mockAssignErrorHandler).toHaveBeenCalled();
      expect(checkout).toBeDefined();
      expect(checkout.paymentMethods).toBe(mockPaymentMethods);
      expect(checkout.configuration).toBe(mockConfig);
    });

    test('forwards onBeforeSubmit results to the native session bridge', async () => {
      const onBeforeSubmit = jest.fn(
        async (data: { shopperEmail?: string }) => ({
          type: 'proceed' as const,
          data: { ...data, shopperEmail: 'updated@example.com' },
          sessionData: 'updated_session_data',
        })
      );

      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        { ...sessionCallbacks, onBeforeSubmit }
      );

      const handler = mockAssignBeforeSubmitHandler.mock.calls[0][0];
      const data = { shopperEmail: 'shopper@example.com' };
      await handler(data);

      expect(onBeforeSubmit).toHaveBeenCalledWith(data);
      expect(mockProvideBeforeSubmitResult).toHaveBeenCalledWith({
        type: 'proceed',
        data: { shopperEmail: 'updated@example.com' },
        sessionData: 'updated_session_data',
      });
    });

    test('forwards an abort decision to the native session bridge', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        {
          ...sessionCallbacks,
          onBeforeSubmit: async () => ({ type: 'abort' }),
        }
      );

      const handler = mockAssignBeforeSubmitHandler.mock.calls[0][0];
      await handler({});

      expect(mockProvideBeforeSubmitResult).toHaveBeenCalledWith({
        type: 'abort',
      });
    });

    test('proceeds unchanged when no before-submit callback is supplied', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      const handler = mockAssignBeforeSubmitHandler.mock.calls[0][0];
      const data = { shopperEmail: 'shopper@example.com' };
      await handler(data);

      expect(mockProvideBeforeSubmitResult).toHaveBeenCalledWith({
        type: 'proceed',
        data,
      });
    });

    test('returned checkout has expected shape', async () => {
      const checkout = await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(typeof checkout.isAvailable).toBe('function');
      expect(typeof checkout.requiresUserInteraction).toBe('function');
      expect(typeof checkout.submit).toBe('function');
      expect(typeof checkout.subscribe).toBe('function');
      expect(typeof checkout.unsubscribe).toBe('function');
      expect(checkout.paymentMethods).toBe(mockPaymentMethods);
      expect(checkout.configuration).toBe(mockConfig);
    });
  });

  describe('setupAdvanced (advanced flow)', () => {
    // The advanced flow is the only entry point handed a payment methods response by the
    // merchant, so it is the only one that can be given the wrong thing. Failing here beats
    // failing later in native with a less obvious message.
    test.each([
      ['undefined', undefined],
      ['a JSON string that was never parsed', '{"paymentMethods":[]}'],
      ['an array instead of the whole response', [{ type: 'scheme' }]],
    ])('rejects %s', async (_label, badResponse) => {
      await expect(
        AdyenCheckout.setupAdvanced(
          badResponse as any,
          mockConfig,
          advancedCallbacks
        )
      ).rejects.toThrow();
      expect(mockSetup).not.toHaveBeenCalled();
    });

    test('sets up the context, registers listeners and resolves checkout', async () => {
      const checkout = await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockSetup).toHaveBeenCalledWith(mockPaymentMethods, mockConfig);
      expect(mockAssignSubmitHandler).toHaveBeenCalled();
      expect(mockAssignAdditionalDetailsHandler).toHaveBeenCalled();
      expect(mockAssignAdvancedCompleteHandler).toHaveBeenCalled();
      expect(mockAssignAdvancedErrorHandler).toHaveBeenCalled();
      expect(checkout).toBeDefined();
      expect(checkout.paymentMethods).toBe(mockPaymentMethods);
      expect(checkout.configuration).toBe(mockConfig);
    });
  });

  describe('callback handler wiring', () => {
    test('session onComplete is called with result only (no handler)', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(mockAssignCompletionHandler).toHaveBeenCalled();

      // Simulate the native completion event flowing back to JS.
      const nativeCompletionHandler =
        mockAssignCompletionHandler.mock.calls[0][0];
      const sessionResult = { resultCode: 'Authorised' };
      nativeCompletionHandler(sessionResult);

      expect(sessionCallbacks.onComplete).toHaveBeenCalledTimes(1);
      expect(sessionCallbacks.onComplete).toHaveBeenCalledWith(sessionResult);
      // Terminal callback — no handler parameter
      expect(sessionCallbacks.onComplete.mock.calls[0]).toHaveLength(1);
    });

    test('session onError is called with error only (no handler)', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(mockAssignErrorHandler).toHaveBeenCalled();

      const nativeErrorHandler = mockAssignErrorHandler.mock.calls[0][0];
      const sessionError = { message: 'boom', errorCode: 'unknown' };
      nativeErrorHandler(sessionError);

      expect(sessionCallbacks.onError).toHaveBeenCalledTimes(1);
      expect(sessionCallbacks.onError).toHaveBeenCalledWith(sessionError);
      // Terminal callback — no handler parameter
      expect(sessionCallbacks.onError.mock.calls[0]).toHaveLength(1);
    });

    test('advanced onSubmit dispatches the returned SubmitResult to DropIn', async () => {
      // Consumer callback returns a SubmitResult
      advancedCallbacks.onSubmit.mockResolvedValue(
        SubmitResult.action({ type: 'threeDS2', paymentMethodType: 'scheme' })
      );

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockAssignSubmitHandler).toHaveBeenCalled();

      // Simulate the native submit event flowing back to JS.
      const nativeSubmitHandler = mockAssignSubmitHandler.mock.calls[0][0];
      await nativeSubmitHandler({
        paymentData: { paymentMethod: { type: 'scheme' } },
      });

      expect(advancedCallbacks.onSubmit).toHaveBeenCalledTimes(1);
      const [dataArg] = advancedCallbacks.onSubmit.mock.calls[0];
      // returnUrl is injected from the configuration.
      expect(dataArg.returnUrl).toBe('myapp://checkout');
      // The action result is dispatched to DropIn
      expect(mockDropInAction).toHaveBeenCalledWith({
        type: 'threeDS2',
        paymentMethodType: 'scheme',
      });
    });

    test('advanced onSubmit dispatches completed result to DropIn', async () => {
      advancedCallbacks.onSubmit.mockResolvedValue(
        SubmitResult.completed('Authorised')
      );

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const nativeSubmitHandler = mockAssignSubmitHandler.mock.calls[0][0];
      await nativeSubmitHandler({
        paymentData: { paymentMethod: { type: 'scheme' } },
      });

      expect(mockDropInCompletion).toHaveBeenCalledWith('Authorised');
    });

    test('advanced onSubmit dispatches retry result to DropIn', async () => {
      advancedCallbacks.onSubmit.mockResolvedValue(
        SubmitResult.retry('Card declined')
      );

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const nativeSubmitHandler = mockAssignSubmitHandler.mock.calls[0][0];
      await nativeSubmitHandler({
        paymentData: { paymentMethod: { type: 'scheme' } },
      });

      expect(mockDropInRetry).toHaveBeenCalledWith('Card declined');
    });

    test('advanced onAdditionalDetails dispatches the returned result to DropIn', async () => {
      advancedCallbacks.onAdditionalDetails.mockResolvedValue({
        resultCode: 'Authorised',
      });

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockAssignAdditionalDetailsHandler).toHaveBeenCalled();

      // Simulate the native additional-details event flowing back to JS.
      const nativeAdditionalDetailsHandler =
        mockAssignAdditionalDetailsHandler.mock.calls[0][0];
      const detailsData = { details: {} };
      await nativeAdditionalDetailsHandler(detailsData);

      expect(advancedCallbacks.onAdditionalDetails).toHaveBeenCalledTimes(1);
      const [dataArg] = advancedCallbacks.onAdditionalDetails.mock.calls[0];
      // Not `toBe`: the payload is copied so the transport tag can be stripped off it.
      expect(dataArg).toEqual(detailsData);
      // Untagged means Drop-in
      expect(mockDropInCompletion).toHaveBeenCalledWith('Authorised');
    });

    test('context-tagged submit dispatches to AdyenContext, not DropIn', async () => {
      advancedCallbacks.onSubmit.mockResolvedValue(
        SubmitResult.action({ type: 'threeDS2', paymentMethodType: 'scheme' })
      );

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const nativeSubmitHandler = mockAssignSubmitHandler.mock.calls[0][0];
      await nativeSubmitHandler({
        source: 'context',
        paymentData: { paymentMethod: { type: 'scheme' } },
      });

      // A headless submit must resume the context continuation; sending it to Drop-in is what
      // previously left checkout.submit() hanging forever.
      expect(mockContextAction).toHaveBeenCalledWith({
        type: 'threeDS2',
        paymentMethodType: 'scheme',
      });
      expect(mockDropInAction).not.toHaveBeenCalled();
    });

    test('dropin-tagged submit dispatches to DropIn', async () => {
      advancedCallbacks.onSubmit.mockResolvedValue(
        SubmitResult.completed('Authorised')
      );

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const nativeSubmitHandler = mockAssignSubmitHandler.mock.calls[0][0];
      await nativeSubmitHandler({
        source: 'dropin',
        paymentData: { paymentMethod: { type: 'scheme' } },
      });

      expect(mockDropInCompletion).toHaveBeenCalledWith('Authorised');
      expect(mockContextCompletion).not.toHaveBeenCalled();
    });

    test('context-tagged additional details dispatch to AdyenContext', async () => {
      advancedCallbacks.onAdditionalDetails.mockResolvedValue({
        resultCode: 'Authorised',
      });

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const handler = mockAssignAdditionalDetailsHandler.mock.calls[0][0];
      await handler({ source: 'context', details: {} });

      expect(mockContextCompletion).toHaveBeenCalledWith('Authorised');
      expect(mockDropInCompletion).not.toHaveBeenCalled();
    });

    test('the source tag never reaches a merchant callback', async () => {
      advancedCallbacks.onAdditionalDetails.mockResolvedValue({
        resultCode: 'Authorised',
      });

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const detailsHandler =
        mockAssignAdditionalDetailsHandler.mock.calls[0][0];
      await detailsHandler({ source: 'context', details: { foo: 'bar' } });

      // This payload is posted verbatim to /payments/details, so a stray `source` would be
      // sent to the API.
      const [detailsArg] = advancedCallbacks.onAdditionalDetails.mock
        .calls[0] as any[];
      expect(detailsArg).toEqual({ details: { foo: 'bar' } });
      expect(detailsArg).not.toHaveProperty('source');

      const completeHandler =
        mockAssignAdvancedCompleteHandler.mock.calls[0][0];
      completeHandler({ source: 'dropin', resultCode: 'Authorised' });

      const [completeArg] = advancedCallbacks.onComplete.mock.calls[0] as any[];
      expect(completeArg).not.toHaveProperty('source');
    });

    test('advanced onComplete is called with result only (no handler)', async () => {
      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockAssignAdvancedCompleteHandler).toHaveBeenCalled();

      const nativeAdvancedCompleteHandler =
        mockAssignAdvancedCompleteHandler.mock.calls[0][0];
      const paymentResult = { resultCode: 'Authorised' };
      nativeAdvancedCompleteHandler(paymentResult);

      expect(advancedCallbacks.onComplete).toHaveBeenCalledTimes(1);
      expect(advancedCallbacks.onComplete).toHaveBeenCalledWith(paymentResult);
      // Terminal callback — no handler parameter
      expect(advancedCallbacks.onComplete.mock.calls[0]).toHaveLength(1);
    });

    test('advanced onError is called with error only (no handler)', async () => {
      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockAssignAdvancedErrorHandler).toHaveBeenCalled();

      const nativeAdvancedErrorHandler =
        mockAssignAdvancedErrorHandler.mock.calls[0][0];
      const advancedError = { message: 'nope', errorCode: 'unknown' };
      nativeAdvancedErrorHandler(advancedError);

      expect(advancedCallbacks.onError).toHaveBeenCalledTimes(1);
      expect(advancedCallbacks.onError).toHaveBeenCalledWith(advancedError);
      // Terminal callback — no handler parameter
      expect(advancedCallbacks.onError.mock.calls[0]).toHaveLength(1);
    });
  });

  describe('Apple Pay handler wiring', () => {
    test('setup (sessions flow) subscribes to all Apple Pay events', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(mockAssignApplePayAuthorizationHandler).toHaveBeenCalled();
      expect(mockAssignApplePayShippingContactHandler).toHaveBeenCalled();
      expect(mockAssignApplePayShippingMethodHandler).toHaveBeenCalled();
      expect(mockAssignApplePayCouponCodeHandler).toHaveBeenCalled();
    });

    test('setupAdvanced subscribes to all Apple Pay events', async () => {
      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockAssignApplePayAuthorizationHandler).toHaveBeenCalled();
      expect(mockAssignApplePayShippingContactHandler).toHaveBeenCalled();
      expect(mockAssignApplePayShippingMethodHandler).toHaveBeenCalled();
      expect(mockAssignApplePayCouponCodeHandler).toHaveBeenCalled();
    });

    test('authorization auto-resolves success when no merchant callback', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(mockAssignApplePayAuthorizationHandler).toHaveBeenCalled();

      const nativeAuthHandler =
        mockAssignApplePayAuthorizationHandler.mock.calls[0][0];
      nativeAuthHandler({ billingContact: { emailAddress: 'a@b.com' } });

      expect(mockProvideAuthorizationResult).toHaveBeenCalledWith({
        status: 'success',
      });
    });

    test('authorization forwards merchant reject with errors', async () => {
      const onAuthorize = jest.fn((_payment: any, actions: any) =>
        actions.reject([{ type: 'billingAddress', message: 'Bad' }])
      );
      const applePayConfig = {
        ...mockConfig,
        applepay: { merchantID: 'merchant.com.test', onAuthorize },
      };

      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        applePayConfig,
        sessionCallbacks
      );

      expect(mockAssignApplePayAuthorizationHandler).toHaveBeenCalled();

      const payment = { billingContact: { emailAddress: 'a@b.com' } };
      const nativeAuthHandler =
        mockAssignApplePayAuthorizationHandler.mock.calls[0][0];
      nativeAuthHandler(payment);

      expect(onAuthorize).toHaveBeenCalledWith(payment, expect.any(Object));
      expect(mockProvideAuthorizationResult).toHaveBeenCalledWith({
        status: 'failure',
        errors: [{ type: 'billingAddress', message: 'Bad' }],
      });
    });

    test('shipping contact auto-resolves with {} when no merchant callback', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(mockAssignApplePayShippingContactHandler).toHaveBeenCalled();

      const nativeContactHandler =
        mockAssignApplePayShippingContactHandler.mock.calls[0][0];
      nativeContactHandler({ emailAddress: 'a@b.com' });

      expect(mockProvideShippingContactUpdate).toHaveBeenCalledWith({});
    });

    test('coupon code forwards merchant resolve payload', async () => {
      const onCouponCodeChange = jest.fn((_code: string, resolve: any) =>
        resolve({ errors: [{ type: 'couponCode', message: 'Invalid' }] })
      );
      const couponConfig = {
        ...mockConfig,
        applepay: { merchantID: 'merchant.com.test', onCouponCodeChange },
      };

      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        couponConfig,
        sessionCallbacks
      );

      expect(mockAssignApplePayCouponCodeHandler).toHaveBeenCalled();

      const nativeCouponHandler =
        mockAssignApplePayCouponCodeHandler.mock.calls[0][0];
      nativeCouponHandler({ couponCode: 'SAVE10' });

      expect(onCouponCodeChange).toHaveBeenCalledWith(
        'SAVE10',
        expect.any(Function)
      );
      expect(mockProvideCouponCodeUpdate).toHaveBeenCalledWith({
        errors: [{ type: 'couponCode', message: 'Invalid' }],
      });
    });
  });

  describe('re-setup cleanup', () => {
    test('does not call native cleanup on the first setup', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      // cleanup is called in beforeEach for state reset, so we check
      // that it was NOT called again after clearAllMocks during setup
      expect(mockCleanup).not.toHaveBeenCalled();
    });

    test('does not call native cleanup on re-setup (JS state cleared only)', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      // Re-setup clears JS state but does NOT call native cleanup —
      // the native side handles its own state when it receives the new setup call.
      expect(mockCleanup).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    test('cleans up native listeners and context when called internally', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      // cleanup is private; access via cast for testing
      (AdyenCheckout as any).cleanup();

      expect(mockRemoveAllListeners).toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalled();
    });

    test('is idempotent — calling cleanup twice does not call native cleanup twice', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      (AdyenCheckout as any).cleanup();
      jest.clearAllMocks();
      (AdyenCheckout as any).cleanup();

      expect(mockCleanup).not.toHaveBeenCalled();
    });
  });

  describe('checkout.invalidate()', () => {
    test('tears down native resources for an abandoned flow', async () => {
      const checkout = await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      checkout.invalidate();

      expect(mockRemoveAllListeners).toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    test('is idempotent', async () => {
      const checkout = await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      checkout.invalidate();
      checkout.invalidate();

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    test('suppresses terminal events that arrive after invalidation', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );
      const nativeCompletionHandler =
        mockAssignCompletionHandler.mock.calls[0][0];

      const checkout = await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );
      checkout.invalidate();
      nativeCompletionHandler({ resultCode: 'Authorised' });

      expect(sessionCallbacks.onComplete).not.toHaveBeenCalled();
      expect(advancedCallbacks.onComplete).not.toHaveBeenCalled();
    });

    test('does not block a subsequent setup', async () => {
      const first = await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );
      first.invalidate();

      const second = await AdyenCheckout.setup(
        { id: 'session_456', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );
      const nativeCompletionHandler =
        mockAssignCompletionHandler.mock.calls.at(-1)![0];
      nativeCompletionHandler({ resultCode: 'Authorised' });

      expect(second).toBeDefined();
      expect(sessionCallbacks.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('auto-cleanup on terminal callbacks', () => {
    test('auto-cleans up after session onComplete', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      const nativeCompletionHandler =
        mockAssignCompletionHandler.mock.calls[0][0];
      nativeCompletionHandler({ resultCode: 'Authorised' });

      // After auto-cleanup, native cleanup should have been called
      expect(mockCleanup).toHaveBeenCalled();
    });

    test('notifies the merchant and cleans up only once for duplicate terminal events', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      const nativeCompletionHandler =
        mockAssignCompletionHandler.mock.calls[0][0];
      const nativeErrorHandler = mockAssignErrorHandler.mock.calls[0][0];
      nativeCompletionHandler({ resultCode: 'Authorised' });
      nativeErrorHandler({ message: 'err', errorCode: 'unknown' });

      expect(sessionCallbacks.onComplete).toHaveBeenCalledTimes(1);
      expect(sessionCallbacks.onError).not.toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    test('auto-cleans up after session onError', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      const nativeErrorHandler = mockAssignErrorHandler.mock.calls[0][0];
      nativeErrorHandler({ message: 'err', errorCode: 'unknown' });

      expect(mockCleanup).toHaveBeenCalled();
    });

    test('auto-cleans up after advanced onComplete', async () => {
      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const nativeAdvancedCompleteHandler =
        mockAssignAdvancedCompleteHandler.mock.calls[0][0];
      nativeAdvancedCompleteHandler({ resultCode: 'Authorised' });

      expect(mockCleanup).toHaveBeenCalled();
    });

    test('auto-cleans up after advanced onError', async () => {
      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      const nativeAdvancedErrorHandler =
        mockAssignAdvancedErrorHandler.mock.calls[0][0];
      nativeAdvancedErrorHandler({ message: 'err', errorCode: 'unknown' });

      expect(mockCleanup).toHaveBeenCalled();
    });
  });
});
