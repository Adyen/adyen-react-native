import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { SessionWrapper } from '../SessionWrapper';

/** Mock SessionNativeModule */
function createMockSessionModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    hide: jest.fn(),
    createSession: jest.fn<() => Promise<any>>().mockResolvedValue({
      id: 'session_123',
      sessionData: 'test_session_data',
      paymentMethods: { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
    }),
  } as any;
}

describe('SessionWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockSessionModule>;

  beforeEach(() => {
    mockNativeModule = createMockSessionModule();
  });

  describe('createSession', () => {
    test('should call native module createSession', async () => {
      const wrapper = new SessionWrapper(mockNativeModule);
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

      const wrapper = new SessionWrapper(mockNativeModule);
      const result = await wrapper.createSession(
        { id: 'session_456', sessionData: 'data' },
        { environment: 'test' as const, clientKey: 'key' }
      );

      expect(result).toEqual(expectedResult);
    });

    test('should propagate errors from native module', async () => {
      const error = new Error('Session creation failed');
      mockNativeModule.createSession.mockRejectedValue(error);

      const wrapper = new SessionWrapper(mockNativeModule);

      await expect(
        wrapper.createSession(
          { id: 'test', sessionData: 'data' },
          { environment: 'test' as const, clientKey: 'key' }
        )
      ).rejects.toThrow('Session creation failed');
    });
  });

  describe('hide', () => {
    test('should call native module hide with success and empty message', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      wrapper.hide(true);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });

    test('should call native module hide with failure and empty message', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      wrapper.hide(false);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: '',
      });
    });

    test('should pass message option when provided', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      wrapper.hide(true, { message: 'Session completed' });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, {
        message: 'Session completed',
      });
    });

    test('should handle undefined option', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      wrapper.hide(false, undefined);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: '',
      });
    });

    test('should handle option with undefined message', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      wrapper.hide(true, { message: undefined });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });
  });

  describe('SessionHelperModule interface', () => {
    test('should implement createSession method', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      expect(typeof wrapper.createSession).toBe('function');
    });

    test('should implement hide method from AdyenComponent', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      expect(typeof wrapper.hide).toBe('function');
    });

    test('should implement onComplete method', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      expect(typeof wrapper.assignCompletionHandler).toBe('function');
    });

    test('should implement onError method', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      expect(typeof wrapper.assignErrorHandler).toBe('function');
    });

    test('should implement removeAllListeners method', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      expect(typeof wrapper.removeAllListeners).toBe('function');
    });
  });

  describe('event subscriptions', () => {
    test('onComplete should return subscription and track it', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      const callback = jest.fn();

      const subscription = wrapper.assignCompletionHandler(callback);

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('onError should return subscription and track it', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
      const callback = jest.fn();

      const subscription = wrapper.assignErrorHandler(callback);

      expect(subscription).toBeDefined();
      expect(typeof subscription.remove).toBe('function');
    });

    test('removeAllListeners should remove all tracked subscriptions', () => {
      const wrapper = new SessionWrapper(mockNativeModule);
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
      const wrapper = new SessionWrapper(mockNativeModule);

      wrapper.assignCompletionHandler(jest.fn());
      wrapper.assignErrorHandler(jest.fn());
      wrapper.removeAllListeners();

      // Calling again should not throw (array is empty)
      expect(() => wrapper.removeAllListeners()).not.toThrow();
    });
  });
});
