import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { GooglePayWrapper } from '../GooglePayWrapper';

/** Mock GooglePayNativeModule */
function createMockGooglePayModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({ supportedEvents: [] })),
    hide: jest.fn(),
    open: jest.fn(),
    handle: jest.fn(),
    isAvailable: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  } as any;
}

describe('GooglePayWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockGooglePayModule>;

  beforeEach(() => {
    mockNativeModule = createMockGooglePayModule();
  });

  describe('name', () => {
    test('should return "GooglePay"', () => {
      const wrapper = new GooglePayWrapper(mockNativeModule);
      expect(wrapper.name).toBe('GooglePay');
    });
  });

  describe('isAvailable', () => {
    test('should call native module and return availability', async () => {
      const wrapper = new GooglePayWrapper(mockNativeModule);
      const paymentMethod = { type: 'googlepay', name: 'Google Pay' };
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
      const wrapper = new GooglePayWrapper(mockNativeModule);

      const result = await wrapper.isAvailable(
        { type: 'googlepay', name: 'Google Pay' },
        { environment: 'test' as const, clientKey: 'key', returnUrl: 'app://' }
      );

      expect(result).toBe(false);
    });
  });
});
