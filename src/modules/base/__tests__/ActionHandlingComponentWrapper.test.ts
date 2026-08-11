import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { PaymentComponentWrapper } from '../PaymentComponentWrapper';
import {
  createMockPaymentModule,
  mockPaymentAction,
} from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestPaymentActionWrapper extends PaymentComponentWrapper {
  get name(): string {
    return 'TestPaymentActionWrapper';
  }
}

describe('PaymentComponentWrapper (action handling)', () => {
  describe('constructor', () => {
    test('should read supported events from native module getConstants', () => {
      const mockNativeModule = createMockPaymentModule([
        Event.onError,
        Event.onComplete,
        Event.onSubmit,
        Event.onAdditionalDetails,
      ]);
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(true);
    });
  });

  describe('action', () => {
    test('should call native module action with payment action', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      wrapper.action(mockPaymentAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(mockPaymentAction);
    });

    test('should handle redirect action', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      const redirectAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
        url: 'https://example.com/redirect',
      };
      wrapper.action(redirectAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(redirectAction);
    });

    test('should handle threeDS2 action', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      const threeDS2Action = {
        type: 'threeDS2',
        paymentMethodType: 'scheme',
        token: 'test_token',
      };
      wrapper.action(threeDS2Action);
      expect(mockNativeModule.action).toHaveBeenCalledWith(threeDS2Action);
    });

    test('should handle voucher action', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      const voucherAction = {
        type: 'voucher',
        paymentMethodType: 'boletobancario',
      };
      wrapper.action(voucherAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(voucherAction);
    });
  });

  describe('inherited methods', () => {
    test('should inherit open method from PaymentComponentWrapper', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      const paymentMethods = { paymentMethods: [] };
      wrapper.open(paymentMethods);
      expect(mockNativeModule.open).toHaveBeenCalledWith(paymentMethods);
    });

    test('should inherit completion method from ModuleWrapper', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      wrapper.completion('Authorised');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Authorised');
    });

    test('should inherit retry method from ModuleWrapper', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      wrapper.retry('Try again');
      expect(mockNativeModule.retry).toHaveBeenCalledWith('Try again');
    });
  });

  describe('PaymentResultHandler implementation', () => {
    test('should implement action method', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      expect(typeof wrapper.action).toBe('function');
    });

    test('should implement completion method', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      expect(typeof wrapper.completion).toBe('function');
    });

    test('should implement retry method', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      expect(typeof wrapper.retry).toBe('function');
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentActionWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestPaymentActionWrapper');
    });
  });
});
