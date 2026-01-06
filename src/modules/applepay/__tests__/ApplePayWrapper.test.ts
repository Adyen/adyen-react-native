import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { Event } from '../../../core';
import { ApplePayWrapper } from '../ApplePayWrapper';

/** Mock ApplePayNativeModule */
function createMockApplePayModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    hide: jest.fn(),
    open: jest.fn(),
    isAvailable: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  } as any;
}

describe('ApplePayWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockApplePayModule>;

  beforeEach(() => {
    mockNativeModule = createMockApplePayModule();
  });

  describe('name', () => {
    test('should return "ApplePay"', () => {
      const wrapper = new ApplePayWrapper(mockNativeModule);
      expect(wrapper.name).toBe('ApplePay');
    });
  });

  describe('events', () => {
    test('should support PaymentComponentWrapper events', () => {
      const wrapper = new ApplePayWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });

    test('should not support onAdditionalDetails (not action-handling)', () => {
      const wrapper = new ApplePayWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(false);
    });
  });

  describe('isAvailable', () => {
    test('should call native module and return availability', async () => {
      const wrapper = new ApplePayWrapper(mockNativeModule);
      const paymentMethod = { type: 'applepay', name: 'Apple Pay' };
      const config = {
        environment: 'test' as const,
        clientKey: 'test_key',
        countryCode: 'NL',
        returnUrl: 'myapp://checkout',
      };

      const result = await wrapper.isAvailable(paymentMethod, config);

      expect(mockNativeModule.isAvailable).toHaveBeenCalledWith(
        paymentMethod,
        config
      );
      expect(result).toBe(true);
    });

    test('should return false when not available', async () => {
      mockNativeModule.isAvailable.mockResolvedValue(false);
      const wrapper = new ApplePayWrapper(mockNativeModule);

      const result = await wrapper.isAvailable(
        { type: 'applepay', name: 'Apple Pay' },
        { environment: 'test' as const, clientKey: 'key', returnUrl: 'app://' }
      );

      expect(result).toBe(false);
    });
  });
});
