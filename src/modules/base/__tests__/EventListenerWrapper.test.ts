import { describe, expect, test, beforeEach } from '@jest/globals';
import { Event } from '../../../core';
import { EventListenerWrapper } from '../EventListenerWrapper';
import { createMockNativeModule } from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestWrapper extends EventListenerWrapper {
  static readonly events = [Event.onError, Event.onComplete];

  get name(): string {
    return 'TestWrapper';
  }
}

/** Child class to test event inheritance */
class ChildTestWrapper extends TestWrapper {
  static readonly events = [Event.onSubmit];

  get name(): string {
    return 'ChildTestWrapper';
  }
}

/** Grandchild class to test deep inheritance */
class GrandchildTestWrapper extends ChildTestWrapper {
  static readonly events = [Event.onAdditionalDetails];

  get name(): string {
    return 'GrandchildTestWrapper';
  }
}

/** Wrapper with no events */
class EmptyEventsWrapper extends EventListenerWrapper {
  get name(): string {
    return 'EmptyEventsWrapper';
  }
}

describe('EventListenerWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockNativeModule>;

  beforeEach(() => {
    mockNativeModule = createMockNativeModule();
  });

  describe('constructor', () => {
    test('should store native module reference', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.nativeModule).toBe(mockNativeModule);
    });

    test('should collect events from static property', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
    });

    test('should collect events from class hierarchy', () => {
      const wrapper = new ChildTestWrapper(mockNativeModule);
      // Should have both parent and child events
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });

    test('should collect events from deep inheritance chain', () => {
      const wrapper = new GrandchildTestWrapper(mockNativeModule);
      // Should have events from all levels
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(true);
    });

    test('should handle wrapper with no events', () => {
      const wrapper = new EmptyEventsWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(false);
      expect(wrapper.isSupported(Event.onComplete)).toBe(false);
    });
  });

  describe('name property', () => {
    test('should return correct name for TestWrapper', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestWrapper');
    });

    test('should return correct name for ChildTestWrapper', () => {
      const wrapper = new ChildTestWrapper(mockNativeModule);
      expect(wrapper.name).toBe('ChildTestWrapper');
    });
  });

  describe('addListener', () => {
    test('should pass through to native module addListener', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.addListener('testEvent');
      expect(mockNativeModule.addListener).toHaveBeenCalledWith('testEvent');
    });

    test('should call native module with correct event type', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.addListener(Event.onError);
      expect(mockNativeModule.addListener).toHaveBeenCalledWith(Event.onError);
    });
  });

  describe('removeListeners', () => {
    test('should pass through to native module removeListeners', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.removeListeners(5);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(5);
    });

    test('should handle count of 0', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      wrapper.removeListeners(0);
      expect(mockNativeModule.removeListeners).toHaveBeenCalledWith(0);
    });
  });

  describe('isSupported', () => {
    test('should return true for supported events', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
    });

    test('should return false for unsupported events', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(false);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(false);
    });

    test('should return true for inherited events', () => {
      const wrapper = new ChildTestWrapper(mockNativeModule);
      // Parent events
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      // Own events
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });

    test('should return false for unknown event strings', () => {
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.isSupported('unknownEvent')).toBe(false);
    });
  });
});
