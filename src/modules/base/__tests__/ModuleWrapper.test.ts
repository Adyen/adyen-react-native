import { describe, expect, test } from '@jest/globals';
import { Event } from '../../../core';
import { ModuleWrapper, type BaseNativeModule } from '../ModuleWrapper';
import { createMockBaseNativeModule } from './_mock_NativeModule';

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

  describe('hide', () => {
    test('should call native module hide with success and empty message', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(true);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });

    test('should call native module hide with failure and empty message', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(false);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: '',
      });
    });

    test('should pass message option when provided', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(true, { message: 'Payment successful' });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, {
        message: 'Payment successful',
      });
    });

    test('should handle undefined option', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(false, undefined);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(false, {
        message: '',
      });
    });

    test('should handle option with undefined message', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      wrapper.hide(true, { message: undefined });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });
  });

  describe('AdyenComponent implementation', () => {
    test('should implement hide method from AdyenComponent interface', () => {
      const mockNativeModule = createMockBaseNativeModule();
      const wrapper = new TestModuleWrapper(mockNativeModule);
      expect(typeof wrapper.hide).toBe('function');
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
