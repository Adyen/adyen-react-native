import { describe, expect, test } from '@jest/globals';
import {
  EventListenerWrapper,
  type NativeModule,
} from '../EventListenerWrapper';
import { createMockNativeModule } from './_mock_NativeModule';

/** Concrete implementation for testing */
class TestWrapper extends EventListenerWrapper<NativeModule> {}

describe('EventListenerWrapper', () => {
  describe('eventEmitterTarget', () => {
    test('should return the native module', () => {
      const mockNativeModule = createMockNativeModule();
      const wrapper = new TestWrapper(mockNativeModule);
      expect(wrapper.eventEmitterTarget).toBe(mockNativeModule);
    });
  });
});
