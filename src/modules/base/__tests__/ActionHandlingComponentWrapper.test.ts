import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { ActionHandlingComponentWrapper } from '../ActionHandlingComponentWrapper';
import {
  createMockActionHandlingModule,
  mockPaymentAction,
} from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestActionWrapper extends ActionHandlingComponentWrapper {
  get name(): string {
    return 'TestActionWrapper';
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
      const wrapper = new TestActionWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(true);
    });
  });

  describe('handle', () => {
    test('should call native module handle with payment action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      wrapper.handle(mockPaymentAction);
      expect(mockNativeModule.handle).toHaveBeenCalledWith(mockPaymentAction);
    });

    test('should handle redirect action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      const redirectAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
        url: 'https://example.com/redirect',
      };
      wrapper.handle(redirectAction);
      expect(mockNativeModule.handle).toHaveBeenCalledWith(redirectAction);
    });

    test('should handle threeDS2 action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      const threeDS2Action = {
        type: 'threeDS2',
        paymentMethodType: 'scheme',
        token: 'test_token',
      };
      wrapper.handle(threeDS2Action);
      expect(mockNativeModule.handle).toHaveBeenCalledWith(threeDS2Action);
    });

    test('should handle voucher action', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      const voucherAction = {
        type: 'voucher',
        paymentMethodType: 'boletobancario',
      };
      wrapper.handle(voucherAction);
      expect(mockNativeModule.handle).toHaveBeenCalledWith(voucherAction);
    });
  });

  describe('inherited methods', () => {
    test('should inherit open method from PaymentComponentWrapper', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      const paymentMethods = { paymentMethods: [] };
      const config = {
        environment: 'test' as const,
        clientKey: 'test_key',
        countryCode: 'NL',
        amount: { value: 1000, currency: 'EUR' },
        returnUrl: 'myapp://checkout',
      };
      wrapper.open(paymentMethods, config);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        paymentMethods,
        config
      );
    });

    test('should inherit hide method from ModuleWrapper', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      wrapper.hide(true, { message: 'Success' });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, {
        message: 'Success',
      });
    });
  });

  describe('AdyenActionComponent implementation', () => {
    test('should implement handle method from AdyenActionComponent interface', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      expect(typeof wrapper.handle).toBe('function');
    });

    test('should implement hide method from AdyenComponent interface', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      expect(typeof wrapper.hide).toBe('function');
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const mockNativeModule = createMockActionHandlingModule();
      const wrapper = new TestActionWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestActionWrapper');
    });
  });
});
