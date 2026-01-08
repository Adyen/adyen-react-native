import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { ActionModuleWrapper } from '../ActionModuleWrapper';

/** Mock ActionNativeModule */
function createMockActionNativeModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    handle: jest
      .fn<() => Promise<any>>()
      .mockResolvedValue({ resultCode: 'Authorised' }),
    hide: jest.fn(),
    getConstants: jest
      .fn<() => { threeDS2SdkVersion: string }>()
      .mockReturnValue({ threeDS2SdkVersion: '2.2.0' }),
  } as any;
}

describe('ActionModuleWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockActionNativeModule>;

  beforeEach(() => {
    mockNativeModule = createMockActionNativeModule();
  });

  describe('constructor', () => {
    test('should store native module reference', () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      expect(wrapper.nativeModule).toBe(mockNativeModule);
    });

    test('should read threeDS2SdkVersion from getConstants', () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      expect(mockNativeModule.getConstants).toHaveBeenCalled();
      expect(wrapper.threeDS2SdkVersion).toBe('2.2.0');
    });

    test('should handle different SDK versions', () => {
      mockNativeModule.getConstants.mockReturnValue({
        threeDS2SdkVersion: '2.3.1',
      });
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      expect(wrapper.threeDS2SdkVersion).toBe('2.3.1');
    });
  });

  describe('handle', () => {
    test('should call native module handle with action and configuration', async () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      const action = {
        type: 'redirect',
        paymentMethodType: 'ideal',
        url: 'https://example.com',
      };
      const config = {
        environment: 'test' as const,
        clientKey: 'test_key',
      };

      await wrapper.handle(action, config);

      expect(mockNativeModule.handle).toHaveBeenCalledWith(action, config);
    });

    test('should return promise with payment details data', async () => {
      const expectedResult = {
        resultCode: 'Authorised',
        details: { some: 'data' },
      };
      mockNativeModule.handle.mockResolvedValue(expectedResult);

      const wrapper = new ActionModuleWrapper(mockNativeModule);
      const result = await wrapper.handle(
        { type: 'threeDS2', paymentMethodType: 'scheme' },
        { environment: 'test' as const, clientKey: 'key' }
      );

      expect(result).toEqual(expectedResult);
    });

    test('should handle threeDS2 action', async () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      const threeDS2Action = {
        type: 'threeDS2',
        paymentMethodType: 'scheme',
        token: 'test_token',
        subtype: 'fingerprint',
      };
      const config = {
        environment: 'live-eu' as const,
        clientKey: 'live_key',
      };

      await wrapper.handle(threeDS2Action, config);

      expect(mockNativeModule.handle).toHaveBeenCalledWith(
        threeDS2Action,
        config
      );
    });

    test('should propagate errors from native module', async () => {
      const error = new Error('Action handling failed');
      mockNativeModule.handle.mockRejectedValue(error);

      const wrapper = new ActionModuleWrapper(mockNativeModule);

      await expect(
        wrapper.handle(
          { type: 'redirect', paymentMethodType: 'ideal' },
          { environment: 'test' as const, clientKey: 'key' }
        )
      ).rejects.toThrow('Action handling failed');
    });
  });

  describe('hide', () => {
    test('should call native module hide with success true', () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      wrapper.hide(true);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true);
    });

    test('should call native module hide with success false', () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      wrapper.hide(false);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false);
    });
  });

  describe('ActionModule interface', () => {
    test('should implement threeDS2SdkVersion property', () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      expect(typeof wrapper.threeDS2SdkVersion).toBe('string');
    });

    test('should implement handle method', () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      expect(typeof wrapper.handle).toBe('function');
    });

    test('should implement hide method', () => {
      const wrapper = new ActionModuleWrapper(mockNativeModule);
      expect(typeof wrapper.hide).toBe('function');
    });
  });
});
