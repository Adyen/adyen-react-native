import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { ModuleWrapper, type BaseNativeModule } from '../ModuleWrapper';
import {
  createMockBaseNativeModule,
  mockPaymentAction,
} from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestModuleWrapper extends ModuleWrapper<BaseNativeModule> {
  get name(): string {
    return 'TestModuleWrapper';
  }
}

describe('ModuleWrapper', () => {
  describe('constructor', () => {
    test('should read supported events from native module getConstants', () => {
      const mockNativeModule = createMockBaseNativeModule([
        Event.onError,
        Event.onComplete,
      ]);
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
    });
  });

  describe('action', () => {
    test('should call native module action with payment action', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.action(mockPaymentAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(mockPaymentAction);
    });

    test('should handle redirect action', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      const redirectAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
        url: 'https://example.com/redirect',
      };
      wrapper.action(redirectAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(redirectAction);
    });

    test('should handle threeDS2 action', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      const threeDS2Action = {
        type: 'threeDS2',
        paymentMethodType: 'scheme',
        token: 'test_token',
      };
      wrapper.action(threeDS2Action);
      expect(mockNativeModule.action).toHaveBeenCalledWith(threeDS2Action);
    });
  });

  describe('completion', () => {
    test('should call native module completion with result code', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.completion('Authorised');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Authorised');
    });

    test('should call native module completion with Refused', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.completion('Refused');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Refused');
    });

    test('should call native module completion with Error', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.completion('Error');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Error');
    });
  });

  describe('retry', () => {
    test('should call native module retry without message', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.retry();
      expect(mockNativeModule.retry).toHaveBeenCalledWith(undefined);
    });

    test('should call native module retry with message', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.retry('Payment failed, please try again');
      expect(mockNativeModule.retry).toHaveBeenCalledWith(
        'Payment failed, please try again'
      );
    });
  });

  describe('PaymentResultHandler implementation', () => {
    test('should implement action method', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(typeof wrapper.action).toBe('function');
    });

    test('should implement completion method', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(typeof wrapper.completion).toBe('function');
    });

    test('should implement retry method', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(typeof wrapper.retry).toBe('function');
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestModuleWrapper');
    });
  });
});
