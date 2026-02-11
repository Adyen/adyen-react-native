import { describe, expect, test, jest } from '@jest/globals';
import { InstantWrapper } from '../InstantWrapper';

/** Mock InstantNativeModule */
function createMockInstantModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({ supportedEvents: [] })),
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
});
