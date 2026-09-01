import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { ContextModuleWrapper } from '../ContextModuleWrapper';
import { Event } from '../../../core';

// Captures the handlers registered on the emitter so events can be fired manually.
const mockListeners = new Map<string, ((data: any) => void)[]>();

jest.mock('react-native', () => ({
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: (event: string, handler: (data: any) => void) => {
      if (!mockListeners.has(event)) mockListeners.set(event, []);
      mockListeners.get(event)!.push(handler);
      return { remove: jest.fn() };
    },
  })),
}));

function fire(event: Event, data: any) {
  (mockListeners.get(event) ?? []).forEach((handler) => handler(data));
}

/** Mock ContextNativeModule */
function createMockContextModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    action: jest.fn(),
    completion: jest.fn(),
    retry: jest.fn(),
    setup: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    createSession: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 'session_123',
      sessionData: 'test_session_data',
      paymentMethods: { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
    }),
    isAvailable: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    requiresUserInteraction: jest
      .fn<() => Promise<boolean>>()
      .mockResolvedValue(true),
    submit: jest.fn(),
    cleanup: jest.fn(),
    provideBeforeSubmitResult: jest.fn(),
    provideAuthorizationResult: jest.fn(),
    provideShippingContactUpdate: jest.fn(),
    provideShippingMethodUpdate: jest.fn(),
    provideCouponCodeUpdate: jest.fn(),
  } as any;
}

describe('ContextModuleWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockContextModule>;

  beforeEach(() => {
    mockNativeModule = createMockContextModule();
    mockListeners.clear();
  });

  describe('view-tagged event filtering', () => {
    test('ignores events produced by an embedded view', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const callback = jest.fn();
      wrapper.assignSubmitHandler(callback);

      fire(Event.onSubmit, { viewId: 'view-1', paymentData: {} });

      // The view has its own listener. Handling it here as well would run the merchant
      // callback twice and dispatch two results for one payment.
      expect(callback).not.toHaveBeenCalled();
    });

    test('receives events that no view produced', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const callback = jest.fn();
      wrapper.assignSubmitHandler(callback);

      fire(Event.onSubmit, { source: 'context', paymentData: {} });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('before-submit is never view-tagged, so it still reaches the handler', () => {
      // Load-bearing invariant. The session before-submit bridge is context-owned and emits on
      // the untagged bus even for embedded views. If it ever became view-tagged the filter above
      // would swallow it and the session flow would deadlock on a suspended continuation.
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const callback = jest.fn();
      wrapper.assignBeforeSubmitHandler(callback);

      fire(Event.onBeforeSubmit, { shopperEmail: 'shopper@example.com' });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('setup', () => {
    test('should call native module setup', async () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const paymentMethods = {
        paymentMethods: [{ type: 'scheme', name: 'Card' }],
      };
      const config = {
        environment: 'test' as const,
        clientKey: 'test_key',
        countryCode: 'NL',
        returnUrl: 'myapp://checkout',
      };

      await wrapper.setup(paymentMethods, config);

      expect(mockNativeModule.setup).toHaveBeenCalledWith(
        paymentMethods,
        config
      );
    });

    test('should propagate errors from native module setup', async () => {
      const error = new Error('Setup failed');
      mockNativeModule.setup.mockRejectedValue(error);

      const wrapper = new ContextModuleWrapper(mockNativeModule);

      await expect(
        wrapper.setup(
          { paymentMethods: [] },
          {
            environment: 'test' as const,
            clientKey: 'key',
            returnUrl: 'app://',
          }
        )
      ).rejects.toThrow('Setup failed');
    });
  });

  describe('createSession', () => {
    test('should call native module createSession', async () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const session = { id: 'session_123', sessionData: 'test_data' };
      const config = {
        environment: 'test' as const,
        clientKey: 'test_key',
        amount: { value: 1000, currency: 'EUR' },
      };

      await wrapper.createSession(session, config);

      expect(mockNativeModule.createSession).toHaveBeenCalledWith(
        session,
        config
      );
    });

    test('should return session context', async () => {
      const expectedResult = {
        id: 'session_456',
        sessionData: 'new_session_data',
        paymentMethods: { paymentMethods: [{ type: 'ideal', name: 'iDEAL' }] },
      };
      mockNativeModule.createSession.mockResolvedValue(expectedResult);

      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const result = await wrapper.createSession(
        { id: 'session_456', sessionData: 'data' },
        { environment: 'test' as const, clientKey: 'key' }
      );

      expect(result).toEqual(expectedResult);
    });

    test('should propagate errors from native module', async () => {
      const error = new Error('Session creation failed');
      mockNativeModule.createSession.mockRejectedValue(error);

      const wrapper = new ContextModuleWrapper(mockNativeModule);

      await expect(
        wrapper.createSession(
          { id: 'test', sessionData: 'data' },
          { environment: 'test' as const, clientKey: 'key' }
        )
      ).rejects.toThrow('Session creation failed');
    });
  });

  describe('isAvailable', () => {
    test('should forward type to native module and resolve its result', async () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      const result = await wrapper.isAvailable('googlepay');

      expect(mockNativeModule.isAvailable).toHaveBeenCalledWith('googlepay');
      expect(result).toBe(true);
    });

    test('should resolve false when native module reports unavailable', async () => {
      mockNativeModule.isAvailable.mockResolvedValue(false);
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      await expect(wrapper.isAvailable('applepay')).resolves.toBe(false);
    });

    test('should propagate errors from native module', async () => {
      mockNativeModule.isAvailable.mockRejectedValue(new Error('boom'));
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      await expect(wrapper.isAvailable('scheme')).rejects.toThrow('boom');
    });
  });

  describe('requiresUserInteraction', () => {
    test('should forward type to native module and resolve its result', async () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      const result = await wrapper.requiresUserInteraction('scheme');

      expect(mockNativeModule.requiresUserInteraction).toHaveBeenCalledWith(
        'scheme'
      );
      expect(result).toBe(true);
    });

    test('should resolve false for headless payment methods', async () => {
      mockNativeModule.requiresUserInteraction.mockResolvedValue(false);
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      await expect(wrapper.requiresUserInteraction('paypal')).resolves.toBe(
        false
      );
    });
  });

  describe('submit', () => {
    test('should call native module submit with type', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.submit('scheme');
      expect(mockNativeModule.submit).toHaveBeenCalledWith('scheme');
    });
  });

  describe('cleanup', () => {
    test('should call native module cleanup', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.cleanup();
      expect(mockNativeModule.cleanup).toHaveBeenCalled();
    });
  });

  describe('before submit', () => {
    test('forwards the shopper decision to the native module', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const result = {
        type: 'proceed' as const,
        data: { shopperEmail: 'shopper@example.com' },
      };

      wrapper.provideBeforeSubmitResult(result);

      expect(mockNativeModule.provideBeforeSubmitResult).toHaveBeenCalledWith(
        result
      );
    });

    test('returns a tracked before-submit subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const subscription = wrapper.assignBeforeSubmitHandler(jest.fn());

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });
  });

  describe('action', () => {
    test('should call native module action with payment action', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const paymentAction = { type: 'redirect', paymentMethodType: 'ideal' };
      wrapper.action(paymentAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(paymentAction);
    });
  });

  describe('completion', () => {
    test('should call native module completion with result code', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.completion('Authorised');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Authorised');
    });

    test('should call native module completion with Refused', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.completion('Refused');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Refused');
    });
  });

  describe('retry', () => {
    test('should call native module retry without message', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.retry();
      expect(mockNativeModule.retry).toHaveBeenCalledWith(undefined);
    });

    test('should call native module retry with message', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.retry('Session failed');
      expect(mockNativeModule.retry).toHaveBeenCalledWith('Session failed');
    });
  });

  describe('AdyenContextModule interface', () => {
    test('should implement setup method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.setup).toBe('function');
    });

    test('should implement createSession method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.createSession).toBe('function');
    });

    test('should implement isAvailable method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.isAvailable).toBe('function');
    });

    test('should implement requiresUserInteraction method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.requiresUserInteraction).toBe('function');
    });

    test('should implement submit method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.submit).toBe('function');
    });

    test('should implement cleanup method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.cleanup).toBe('function');
    });

    test('should implement action method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.action).toBe('function');
    });

    test('should implement completion method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.completion).toBe('function');
    });

    test('should implement retry method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.retry).toBe('function');
    });

    test('should implement onComplete method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.assignCompletionHandler).toBe('function');
    });

    test('should implement onError method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.assignErrorHandler).toBe('function');
    });

    test('should implement removeAllListeners method', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      expect(typeof wrapper.removeAllListeners).toBe('function');
    });
  });

  describe('Apple Pay continuation methods', () => {
    test('provideAuthorizationResult forwards to native module', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.provideAuthorizationResult({ status: 'success' });
      expect(mockNativeModule.provideAuthorizationResult).toHaveBeenCalledWith({
        status: 'success',
      });
    });

    test('provideShippingContactUpdate forwards to native module', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.provideShippingContactUpdate({ paymentSummaryItems: [] });
      expect(
        mockNativeModule.provideShippingContactUpdate
      ).toHaveBeenCalledWith({ paymentSummaryItems: [] });
    });

    test('provideShippingMethodUpdate forwards to native module', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.provideShippingMethodUpdate({ paymentSummaryItems: [] });
      expect(mockNativeModule.provideShippingMethodUpdate).toHaveBeenCalledWith(
        {
          paymentSummaryItems: [],
        }
      );
    });

    test('provideCouponCodeUpdate forwards to native module', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      wrapper.provideCouponCodeUpdate({ paymentSummaryItems: [] });
      expect(mockNativeModule.provideCouponCodeUpdate).toHaveBeenCalledWith({
        paymentSummaryItems: [],
      });
    });
  });

  describe('Apple Pay event subscriptions', () => {
    test('assignApplePayAuthorizationHandler returns a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const subscription = wrapper.assignApplePayAuthorizationHandler(
        jest.fn()
      );
      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('assignApplePayShippingContactHandler returns a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const subscription = wrapper.assignApplePayShippingContactHandler(
        jest.fn()
      );
      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('assignApplePayShippingMethodHandler returns a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const subscription = wrapper.assignApplePayShippingMethodHandler(
        jest.fn()
      );
      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('assignApplePayCouponCodeHandler returns a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const subscription = wrapper.assignApplePayCouponCodeHandler(jest.fn());
      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('removeAllListeners removes tracked Apple Pay subscriptions', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const authSub = wrapper.assignApplePayAuthorizationHandler(jest.fn());
      const contactSub = wrapper.assignApplePayShippingContactHandler(
        jest.fn()
      );
      const authRemove = jest.fn();
      const contactRemove = jest.fn();
      authSub.remove = authRemove;
      contactSub.remove = contactRemove;

      wrapper.removeAllListeners();

      expect(authRemove).toHaveBeenCalled();
      expect(contactRemove).toHaveBeenCalled();
    });
  });

  describe('event subscriptions', () => {
    test('onComplete should return subscription and track it', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const callback = jest.fn();

      const subscription = wrapper.assignCompletionHandler(callback);

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('onError should return subscription and track it', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const callback = jest.fn();

      const subscription = wrapper.assignErrorHandler(callback);

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('assignSubmitHandler should return a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      const subscription = wrapper.assignSubmitHandler(jest.fn());

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('assignAdditionalDetailsHandler should return a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      const subscription = wrapper.assignAdditionalDetailsHandler(jest.fn());

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('assignAdvancedCompleteHandler should return a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      const subscription = wrapper.assignAdvancedCompleteHandler(jest.fn());

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('assignAdvancedErrorHandler should return a tracked subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      const subscription = wrapper.assignAdvancedErrorHandler(jest.fn());

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('re-registering the same handler replaces the previous subscription', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      const first = wrapper.assignSubmitHandler(jest.fn());
      const firstRemove = jest.fn();
      first.remove = firstRemove;

      wrapper.assignSubmitHandler(jest.fn());

      expect(firstRemove).toHaveBeenCalled();
    });

    test('removeAllListeners should remove all tracked subscriptions', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);
      const mockRemove1 = jest.fn();
      const mockRemove2 = jest.fn();

      const sub1 = wrapper.assignCompletionHandler(jest.fn());
      const sub2 = wrapper.assignErrorHandler(jest.fn());

      // Replace remove functions to track calls
      sub1.remove = mockRemove1;
      sub2.remove = mockRemove2;

      wrapper.removeAllListeners();

      expect(mockRemove1).toHaveBeenCalled();
      expect(mockRemove2).toHaveBeenCalled();
    });

    test('removeAllListeners should clear subscriptions array', () => {
      const wrapper = new ContextModuleWrapper(mockNativeModule);

      wrapper.assignCompletionHandler(jest.fn());
      wrapper.assignErrorHandler(jest.fn());
      wrapper.removeAllListeners();

      // Calling again should not throw (array is empty)
      expect(() => wrapper.removeAllListeners()).not.toThrow();
    });
  });
});
