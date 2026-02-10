import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import {
  EventListenerWrapper,
  type NativeModuleWithConstants,
} from '../EventListenerWrapper';
import { createMockNativeModule } from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestWrapper extends EventListenerWrapper<NativeModuleWithConstants> {
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
