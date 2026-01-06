import { describe, expect, test, beforeEach } from '@jest/globals';
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

/** Child class with additional events */
class ExtendedPaymentWrapper extends PaymentComponentWrapper {
  static readonly events = [Event.onBinValue];

  get name(): string {
    return 'ExtendedPaymentWrapper';
  }
}

describe('PaymentComponentWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockPaymentModule>;

  beforeEach(() => {
    mockNativeModule = createMockPaymentModule();
  });

  describe('static events', () => {
    test('should declare onSubmit event', () => {
      expect(PaymentComponentWrapper.events).toContain(Event.onSubmit);
      expect(PaymentComponentWrapper.events).toHaveLength(1);
    });
  });

  describe('constructor', () => {
    test('should inherit events from ModuleWrapper and PaymentComponentWrapper', () => {
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      // From ModuleWrapper
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      // From PaymentComponentWrapper
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });

    test('should combine events with child class events', () => {
      const wrapper = new ExtendedPaymentWrapper(mockNativeModule);
      // All inherited events
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
      // Child events
      expect(wrapper.isSupported(Event.onBinValue)).toBe(true);
    });
  });

  describe('open', () => {
    test('should call native module open with payment methods and configuration', () => {
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.open(mockPaymentMethodsResponse, mockConfiguration);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        mockPaymentMethodsResponse,
        mockConfiguration
      );
    });

    test('should call native module open with empty payment methods', () => {
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      const emptyPaymentMethods = { paymentMethods: [] };
      wrapper.open(emptyPaymentMethods, mockConfiguration);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        emptyPaymentMethods,
        mockConfiguration
      );
    });

    test('should pass configuration with all optional fields', () => {
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
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.hide(true);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });

    test('should pass message to hide', () => {
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      wrapper.hide(false, { message: 'Error occurred' });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: 'Error occurred',
      });
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const wrapper = new TestPaymentWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestPaymentWrapper');
    });
  });
});
