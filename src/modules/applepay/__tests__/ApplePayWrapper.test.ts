import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { ApplePayWrapper } from '../ApplePayWrapper';

/** Mock ApplePayNativeModule */
function createMockApplePayModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({ supportedEvents: [] })),
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

  describe('handle', () => {
    test('should warn in dev mode - Apple Pay does not support action handling', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const wrapper = new ApplePayWrapper(mockNativeModule);
      const action = { type: 'redirect', paymentMethodType: 'applepay' };

      expect(() => wrapper.handle(action)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Apple Pay does not support action handling')
      );

      warnSpy.mockRestore();
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
