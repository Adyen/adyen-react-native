import { describe, expect, test, beforeEach } from '@jest/globals';
import { Event } from '../../../core';
import { ModuleWrapper } from '../ModuleWrapper';
import { createMockBaseNativeModule } from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestModuleWrapper extends ModuleWrapper {
  get name(): string {
    return 'TestModuleWrapper';
  }
}

/** Child class with additional events */
class ExtendedModuleWrapper extends ModuleWrapper {
  static readonly events = [Event.onSubmit];

  get name(): string {
    return 'ExtendedModuleWrapper';
  }
}

describe('ModuleWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockBaseNativeModule>;

  beforeEach(() => {
    mockNativeModule = createMockBaseNativeModule();
  });

  describe('static events', () => {
    test('should declare onError and onComplete events', () => {
      expect(ModuleWrapper.events).toContain(Event.onError);
      expect(ModuleWrapper.events).toContain(Event.onComplete);
      expect(ModuleWrapper.events).toHaveLength(2);
    });
  });

  describe('constructor', () => {
    test('should inherit events from ModuleWrapper', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
    });

    test('should combine events with child class events', () => {
      const wrapper = new ExtendedModuleWrapper(mockNativeModule);
      // Parent events
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      // Child events
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });
  });

  describe('hide', () => {
    test('should call native module hide with success and empty message', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(true);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });

    test('should call native module hide with failure and empty message', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(false);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: '',
      });
    });

    test('should pass message option when provided', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(true, { message: 'Payment successful' });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, {
        message: 'Payment successful',
      });
    });

    test('should handle undefined option', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(false, undefined);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: '',
      });
    });

    test('should handle option with undefined message', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(true, { message: undefined });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });
  });

  describe('AdyenComponent implementation', () => {
    test('should implement hide method from AdyenComponent interface', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(typeof wrapper.hide).toBe('function');
    });
  });

  describe('name property', () => {
    test('should return correct name', () => {
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(wrapper.name).toBe('TestModuleWrapper');
    });
  });
});
