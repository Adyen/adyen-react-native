import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { PaymentComponentWrapper } from '../PaymentComponentWrapper';
import {
  createMockPaymentModule,
  mockPaymentMethodsResponse,
} from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestPaymentWrapper extends PaymentComponentWrapper {
  get name(): string {
    return 'TestPaymentWrapper';
  }
}

describe('PaymentComponentWrapper', () => {
  describe('constructor', () => {
    test('should read supported events from native module getConstants', () => {
      const mockNativeModule = createMockPaymentModule([
        Event.onError,
        Event.onComplete,
        Event.onSubmit,
      ]);
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });
  });

  describe('open', () => {
    test('should call native module open with payment methods', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.open(mockPaymentMethodsResponse);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        mockPaymentMethodsResponse
      );
    });

    test('should call native module open with empty payment methods', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      const emptyPaymentMethods = { paymentMethods: [] };
      wrapper.open(emptyPaymentMethods);
      expect(mockNativeModule.open).toHaveBeenCalledWith(emptyPaymentMethods);
    });
  });

  describe('inherited completion', () => {
    test('should inherit completion method from ModuleWrapper', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.completion('Authorised');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Authorised');
    });

    test('should pass result code to completion', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.completion('Error');
      expect(mockNativeModule.completion).toHaveBeenCalledWith('Error');
    });
  });

  describe('inherited retry', () => {
    test('should inherit retry method from ModuleWrapper', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.retry();
      expect(mockNativeModule.retry).toHaveBeenCalledWith(undefined);
    });

    test('should pass message to retry', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.retry('Error occurred');
      expect(mockNativeModule.retry).toHaveBeenCalledWith('Error occurred');
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestPaymentWrapper');
    });
  });
});
