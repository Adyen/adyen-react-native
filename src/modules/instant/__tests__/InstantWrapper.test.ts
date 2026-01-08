import { describe, expect, test, jest } from '@jest/globals';
import { Event } from '../../../core';
import { InstantWrapper } from '../InstantWrapper';

/** Mock InstantNativeModule */
function createMockInstantModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    hide: jest.fn(),
    open: jest.fn(),
    handle: jest.fn(),
  } as any;
}

describe('InstantWrapper', () => {
  describe('name', () => {
    test('should return "Instant"', () => {
      const wrapper = new InstantWrapper(createMockInstantModule());
      expect(wrapper.name).toBe('Instant');
    });
  });

  describe('events', () => {
    test('should support inherited events from ActionHandlingComponentWrapper', () => {
      const wrapper = new InstantWrapper(createMockInstantModule());
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onComplete)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
      expect(wrapper.isSupported(Event.onAdditionalDetails)).toBe(true);
    });

    test('should not support DropIn-specific events', () => {
      const wrapper = new InstantWrapper(createMockInstantModule());
      expect(wrapper.isSupported(Event.onBinValue)).toBe(false);
      expect(wrapper.isSupported(Event.onBinLookup)).toBe(false);
    });
  });
});
