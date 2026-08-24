import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Mock functions must be defined before jest.mock calls due to hoisting
const mockCreateSession = jest.fn();
const mockSetup = jest.fn();
const mockCleanup = jest.fn();
const mockRemoveAllListeners = jest.fn();
const mockAssignBeforeSubmitHandler = jest.fn();
const mockProvideBeforeSubmitResult = jest.fn();
const mockAssignCompletionHandler = jest.fn();
const mockAssignErrorHandler = jest.fn();
const mockAssignSubmitHandler = jest.fn();
const mockAssignAdditionalDetailsHandler = jest.fn();
const mockAssignAdvancedCompleteHandler = jest.fn();
const mockAssignAdvancedErrorHandler = jest.fn();
const mockAssignApplePayAuthorizationHandler = jest.fn();
const mockAssignApplePayShippingContactHandler = jest.fn();
const mockAssignApplePayShippingMethodHandler = jest.fn();
const mockAssignApplePayCouponCodeHandler = jest.fn();
const mockProvideAuthorizationResult = jest.fn();
const mockProvideShippingContactUpdate = jest.fn();
const mockProvideShippingMethodUpdate = jest.fn();
const mockProvideCouponCodeUpdate = jest.fn();

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

jest.mock('../../modules/dropin/AdyenDropIn', () => ({
  AdyenDropIn: {
    action: (...args: any[]) => mockDropInAction(...args),
    completion: (...args: any[]) => mockDropInCompletion(...args),
    retry: (...args: any[]) => mockDropInRetry(...args),
  },
}));

jest.mock('../../modules/context/ContextModule', () => ({
  AdyenContext: {
    createSession: (...args: any[]) => mockCreateSession(...args),
    setup: (...args: any[]) => mockSetup(...args),
    cleanup: (...args: any[]) => mockCleanup(...args),
    removeAllListeners: (...args: any[]) => mockRemoveAllListeners(...args),
    assignBeforeSubmitHandler: (...args: any[]) =>
      mockAssignBeforeSubmitHandler(...args),
    provideBeforeSubmitResult: (...args: any[]) =>
      mockProvideBeforeSubmitResult(...args),
    assignCompletionHandler: (...args: any[]) =>
      mockAssignCompletionHandler(...args),
    assignErrorHandler: (...args: any[]) => mockAssignErrorHandler(...args),
    assignSubmitHandler: (...args: any[]) => mockAssignSubmitHandler(...args),
    assignAdditionalDetailsHandler: (...args: any[]) =>
      mockAssignAdditionalDetailsHandler(...args),
    assignAdvancedCompleteHandler: (...args: any[]) =>
      mockAssignAdvancedCompleteHandler(...args),
    assignAdvancedErrorHandler: (...args: any[]) =>
      mockAssignAdvancedErrorHandler(...args),
    assignApplePayAuthorizationHandler: (...args: any[]) =>
      mockAssignApplePayAuthorizationHandler(...args),
    assignApplePayShippingContactHandler: (...args: any[]) =>
      mockAssignApplePayShippingContactHandler(...args),
    assignApplePayShippingMethodHandler: (...args: any[]) =>
      mockAssignApplePayShippingMethodHandler(...args),
    assignApplePayCouponCodeHandler: (...args: any[]) =>
      mockAssignApplePayCouponCodeHandler(...args),
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
    completion: jest.fn(),
    action: jest.fn(),
    retry: jest.fn(),
  },
}));

import { AdyenCheckout } from '../../AdyenCheckout';
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
  onComplete: jest.fn(),
  onError: jest.fn(),
};

const advancedCallbacks = {
  onSubmit: jest.fn<any>(),
  onAdditionalDetails: jest.fn<any>(),
  onComplete: jest.fn(),
  onError: jest.fn(),
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
      expect(dataArg).toBe(detailsData);
      // The completion is dispatched to DropIn
      expect(mockDropInCompletion).toHaveBeenCalledWith('Authorised');
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
        applepay: { onAuthorize },
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
        applepay: { onCouponCodeChange },
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
