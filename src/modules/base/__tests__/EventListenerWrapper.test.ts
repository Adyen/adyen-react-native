import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { EventListenerWrapper } from '../EventListenerWrapper';
import { createMockNativeModule } from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestWrapper extends EventListenerWrapper {
  get name(): string {
    return 'TestWrapper';
  }
}

describe('EventListenerWrapper', () => {
  describe('constructor', () => {
    test('should store native module reference', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.eventEmitterTarget).toBe(mockNativeModule);
    });

    test('should read supported events from getConstants', () => {
      const mockNativeModule = createMockNativeModule([
        Event.onError,
        Event.onComplete,
      ]);
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(false);
    });

    test('should handle empty supported events', () => {
      const mockNativeModule = createMockNativeModule([]);
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(false);
      expect(wrapper.isSupported(Event.onComplete)).toBe(false);
    });

    test('should handle missing getConstants', () => {
      const mockNativeModule = {
        addListener: jest.fn(),
        removeListeners: jest.fn(),
      };
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(false);
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestWrapper');
    });
  });

  describe('eventEmitterTarget', () => {
    test('should return the native module', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.eventEmitterTarget).toBe(mockNativeModule);
    });
  });

  describe('addListener', () => {
    test('should pass through to native module addListener', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.addListener('testEvent');
      expect(mockNativeModule.addListener).toHaveBeenCalledWith('testEvent');
    });

    test('should call native module with correct event type', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.addListener(Event.onError);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(Event.onError);
    });
  });

  describe('removeListeners', () => {
    test('should pass through to native module removeListeners', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.removeListeners(5);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(5);
    });

    test('should handle count of 0', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.removeListeners(0);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(0);
    });
  });

  describe('isSupported', () => {
    test('should return true for supported events from native module', () => {
      const mockNativeModule = createMockNativeModule([
        Event.onError,
        Event.onComplete,
      ]);
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
    });

    test('should return false for unsupported events', () => {
      const mockNativeModule = createMockNativeModule([Event.onError]);
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(false);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(false);
    });

    test('should return false for unknown event strings', () => {
      const mockNativeModule = createMockNativeModule([Event.onError]);
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported('unknownEvent')).toBe(false);
    });
  });
});
