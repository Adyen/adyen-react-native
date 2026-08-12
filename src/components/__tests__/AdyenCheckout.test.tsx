import { describe, expect, test, jest, beforeEach } from '@jest/globals';

// Mock functions must be defined before jest.mock calls due to hoisting
const mockCreateSession = jest.fn();
const mockSetup = jest.fn();
const mockCleanup = jest.fn();
const mockRemoveAllListeners = jest.fn();
const mockAssignCompletionHandler = jest.fn();
const mockAssignErrorHandler = jest.fn();
const mockAssignSubmitHandler = jest.fn();
const mockAssignAdditionalDetailsHandler = jest.fn();
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

jest.mock('../../modules/context/ContextModule', () => ({
  AdyenContext: {
    createSession: (...args: any[]) => mockCreateSession(...args),
    setup: (...args: any[]) => mockSetup(...args),
    cleanup: (...args: any[]) => mockCleanup(...args),
    removeAllListeners: (...args: any[]) => mockRemoveAllListeners(...args),
    assignCompletionHandler: (...args: any[]) =>
      mockAssignCompletionHandler(...args),
    assignErrorHandler: (...args: any[]) => mockAssignErrorHandler(...args),
    assignSubmitHandler: (...args: any[]) => mockAssignSubmitHandler(...args),
    assignAdditionalDetailsHandler: (...args: any[]) =>
      mockAssignAdditionalDetailsHandler(...args),
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
  onSubmit: jest.fn(),
  onAdditionalDetails: jest.fn(),
  onError: jest.fn(),
};

describe('AdyenCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSession.mockResolvedValue({ paymentMethods: mockPaymentMethods });
    mockSetup.mockResolvedValue(undefined);
    // Ensure a clean state for each test
    AdyenCheckout.cleanup();
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

    test('returned checkout has expected shape', async () => {
      const checkout = await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      expect(typeof checkout.isAvailable).toBe('function');
      expect(typeof checkout.requiresUserInteraction).toBe('function');
      expect(typeof checkout.submit).toBe('function');
      expect(typeof checkout.cleanup).toBe('function');
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
      expect(mockAssignAdvancedErrorHandler).toHaveBeenCalled();
      expect(checkout).toBeDefined();
      expect(checkout.paymentMethods).toBe(mockPaymentMethods);
      expect(checkout.configuration).toBe(mockConfig);
    });
  });

  describe('callback handler wiring', () => {
    test('session onComplete receives a result handler exposing completion', async () => {
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
      const [resultArg, handlerArg] = sessionCallbacks.onComplete.mock.calls[0];
      expect(resultArg).toBe(sessionResult);
      expect(typeof handlerArg.completion).toBe('function');
      // Completion-only handler must not leak action/retry at runtime.
      expect('action' in handlerArg).toBe(false);
      expect('retry' in handlerArg).toBe(false);
    });

    test('session onError receives a completion-only handler', async () => {
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
      const [errorArg, handlerArg] = sessionCallbacks.onError.mock.calls[0];
      expect(errorArg).toBe(sessionError);
      expect(typeof handlerArg.completion).toBe('function');
      expect('action' in handlerArg).toBe(false);
      expect('retry' in handlerArg).toBe(false);
    });

    test('advanced onSubmit receives a handler exposing action, completion and retry', async () => {
      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockAssignSubmitHandler).toHaveBeenCalled();

      // Simulate the native submit event flowing back to JS.
      const nativeSubmitHandler = mockAssignSubmitHandler.mock.calls[0][0];
      nativeSubmitHandler({
        paymentData: { paymentMethod: { type: 'scheme' } },
      });

      expect(advancedCallbacks.onSubmit).toHaveBeenCalledTimes(1);
      const [dataArg, handlerArg] = advancedCallbacks.onSubmit.mock.calls[0];
      // returnUrl is injected from the configuration.
      expect(dataArg.returnUrl).toBe('myapp://checkout');
      expect(typeof handlerArg.action).toBe('function');
      expect(typeof handlerArg.completion).toBe('function');
      expect(typeof handlerArg.retry).toBe('function');
    });

    test('advanced onAdditionalDetails receives a completion-only handler', async () => {
      await AdyenCheckout.setupAdvanced(
        mockPaymentMethods,
        mockConfig,
        advancedCallbacks
      );

      expect(mockAssignAdditionalDetailsHandler).toHaveBeenCalled();

      // Simulate the native additional-details event flowing back to JS.
      const nativeAdditionalDetailsHandler =
        mockAssignAdditionalDetailsHandler.mock.calls[0][0];
      const detailsData = { data: { details: {} } };
      nativeAdditionalDetailsHandler(detailsData);

      expect(advancedCallbacks.onAdditionalDetails).toHaveBeenCalledTimes(1);
      const [dataArg, handlerArg] =
        advancedCallbacks.onAdditionalDetails.mock.calls[0];
      expect(dataArg).toBe(detailsData);
      expect(typeof handlerArg.completion).toBe('function');
      // Completion-only handler must not leak action/retry at runtime.
      expect('action' in handlerArg).toBe(false);
      expect('retry' in handlerArg).toBe(false);
    });

    test('advanced onError receives a completion-only handler', async () => {
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
      const [errorArg, handlerArg] = advancedCallbacks.onError.mock.calls[0];
      expect(errorArg).toBe(advancedError);
      expect(typeof handlerArg.completion).toBe('function');
      expect('action' in handlerArg).toBe(false);
      expect('retry' in handlerArg).toBe(false);
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

    test('calls cleanup before creating a new context on re-setup', async () => {
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

      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    test('cleans up native listeners and context', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      AdyenCheckout.cleanup();

      expect(mockRemoveAllListeners).toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalled();
    });

    test('is idempotent — calling cleanup twice does not call native cleanup twice', async () => {
      await AdyenCheckout.setup(
        { id: 'session_123', sessionData: 'session_data' },
        mockConfig,
        sessionCallbacks
      );

      AdyenCheckout.cleanup();
      jest.clearAllMocks();
      AdyenCheckout.cleanup();

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
