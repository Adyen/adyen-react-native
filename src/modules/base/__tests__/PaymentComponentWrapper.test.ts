import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { PaymentComponentWrapper } from '../PaymentComponentWrapper';
import {
  createMockPaymentModule,
  mockPaymentMethodsResponse,
  mockConfiguration,
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
    test('should call native module open with payment methods and configuration', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.open(mockPaymentMethodsResponse, mockConfiguration);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        mockPaymentMethodsResponse,
        mockConfiguration
      );
    });

    test('should call native module open with empty payment methods', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      const emptyPaymentMethods = { paymentMethods: [] };
      wrapper.open(emptyPaymentMethods, mockConfiguration);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        emptyPaymentMethods,
        mockConfiguration
      );
    });

    test('should pass configuration with all optional fields', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      const fullConfig = {
        ...mockConfiguration,
        analytics: { enabled: true },
        dropin: { showPreselectedStoredPaymentMethod: true },
      };
      wrapper.open(mockPaymentMethodsResponse, fullConfig);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        mockPaymentMethodsResponse,
        fullConfig
      );
    });
  });

  describe('inherited hide', () => {
    test('should inherit hide method from ModuleWrapper', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.hide(true);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });

    test('should pass message to hide', () => {
      const mockNativeModule = createMockPaymentModule();
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.hide(false, { message: 'Error occurred' });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: 'Error occurred',
      });
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
