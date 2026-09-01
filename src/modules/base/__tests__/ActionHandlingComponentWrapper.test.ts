import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { ActionHandlingComponentWrapper } from '../ActionHandlingComponentWrapper';
import {
  createMockActionHandlingModule,
  mockPaymentAction,
} from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestActionHandlingWrapper extends ActionHandlingComponentWrapper {
  get name(): string {
    return 'TestActionHandlingWrapper';
  }
}

describe('ActionHandlingComponentWrapper', () => {
  describe('constructor', () => {
    test('should read supported events from native module getConstants', () => {
      const mockNativeModule = createMockActionHandlingModule([
        Event.onError,
        Event.onComplete,
        Event.onSubmit,
        Event.onAdditionalDetails,
      ]);
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(true);
    });
  });

  describe('action', () => {
    test('should call native module action with payment action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      wrapper.action(mockPaymentAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(mockPaymentAction);
    });

    test('should handle redirect action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      const redirectAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
        url: 'https://example.com/redirect',
      };
      wrapper.action(redirectAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(redirectAction);
    });

    test('should handle threeDS2 action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      const threeDS2Action = {
        type: 'threeDS2',
        paymentMethodType: 'scheme',
        token: 'test_token',
      };
      wrapper.action(threeDS2Action);
      expect(mockNativeModule.action).toHaveBeenCalledWith(threeDS2Action);
    });

    test('should handle voucher action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      const voucherAction = {
        type: 'voucher',
        paymentMethodType: 'boletobancario',
      };
      wrapper.action(voucherAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(voucherAction);
    });
  });

  describe('handle', () => {
    test('should call native module handle with payment action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      wrapper.handle(mockPaymentAction);
      expect(mockNativeModule.handle).toHaveBeenCalledWith(mockPaymentAction);
    });
  });

  describe('inherited methods', () => {
    test('should inherit completion method from ModuleWrapper', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      wrapper.completion('Authorised');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Authorised');
    });

    test('should inherit retry method from ModuleWrapper', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      wrapper.retry('Try again');
      expect(mockNativeModule.retry).toHaveBeenCalledWith('Try again');
    });
  });

  describe('interface implementation', () => {
    test('should implement action method', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      expect(typeof wrapper.action).toBe('function');
    });

    test('should implement completion method', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      expect(typeof wrapper.completion).toBe('function');
    });

    test('should implement retry method', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      expect(typeof wrapper.retry).toBe('function');
    });

    test('should implement handle method', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      expect(typeof wrapper.handle).toBe('function');
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionHandlingWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestActionHandlingWrapper');
    });
  });
});
