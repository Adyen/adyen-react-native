import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { EmbeddedComponentBusWrapper } from '../EmbeddedComponentBusWrapper';
import { Event } from '../../../core';

function createMockEmbeddedModule(supportedEvents: string[] = []) {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({ supportedEvents })),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    submit: jest.fn(),
    handle: jest.fn(),
    hide: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
  };
}

describe('EmbeddedComponentBusWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockEmbeddedModule>;

  beforeEach(() => {
    mockNativeModule = createMockEmbeddedModule();
  });

  describe('name', () => {
    test('should return "AdyenComponentBus"', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      expect(wrapper.name).toBe('AdyenComponentBus');
    });
  });

  describe('eventEmitterTarget', () => {
    test('should return the native module', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      expect(wrapper.eventEmitterTarget).toBe(mockNativeModule);
    });
  });

  describe('isSupported', () => {
    test('should return true for events listed in getConstants', () => {
      const module = createMockEmbeddedModule([Event.onError, Event.onSubmit]);
      const wrapper = new EmbeddedComponentBusWrapper(module);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });

    test('should return false for events not listed in getConstants', () => {
      const module = createMockEmbeddedModule([Event.onError]);
      const wrapper = new EmbeddedComponentBusWrapper(module);
      expect(wrapper.isSupported(Event.onComplete)).toBe(false);
    });

    test('should return false when no supported events', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(false);
    });
  });

  describe('subscribe', () => {
    test('should call native module subscribe with viewId', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      wrapper.subscribe('CardComponent');
      expect(mockNativeModule.subscribe).toHaveBeenCalledWith('CardComponent');
    });
  });

  describe('unsubscribe', () => {
    test('should call native module unsubscribe with viewId', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      wrapper.unsubscribe('CardComponent');
      expect(mockNativeModule.unsubscribe).toHaveBeenCalledWith(
        'CardComponent'
      );
    });
  });

  describe('submit', () => {
    test('should call native module submit with viewId', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      wrapper.submit('CardComponent');
      expect(mockNativeModule.submit).toHaveBeenCalledWith('CardComponent');
    });
  });

  describe('handle', () => {
    test('should call native module handle with viewId and action', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      const action = { type: 'redirect', paymentMethodType: 'ideal' } as any;
      wrapper.handle('CardComponent', action);
      expect(mockNativeModule.handle).toHaveBeenCalledWith(
        'CardComponent',
        action
      );
    });
  });

  describe('hide', () => {
    test('should call native module hide with viewId, success true, and option', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      wrapper.hide('CardComponent', true, { message: 'done' });
      expect(mockNativeModule.hide).toHaveBeenCalledWith(
        'CardComponent',
        true,
        { message: 'done' }
      );
    });

    test('should call native module hide with success false and no option', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      wrapper.hide('CardComponent', false);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(
        'CardComponent',
        false,
        undefined
      );
    });
  });

  describe('update', () => {
    test('should call native module update with viewId and results', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      const results = [{ id: '1', name: 'Street 1' }] as any[];
      wrapper.update('CardComponent', results);
      expect(mockNativeModule.update).toHaveBeenCalledWith(
        'CardComponent',
        results
      );
    });
  });

  describe('confirm', () => {
    test('should call native module confirm with viewId, success true, and body', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      const address = { id: '1', name: 'Main St' } as any;
      wrapper.confirm('CardComponent', true, address);
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(
        'CardComponent',
        true,
        address
      );
    });

    test('should call native module confirm with success false and error body', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      wrapper.confirm('CardComponent', false, { message: 'Invalid' });
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(
        'CardComponent',
        false,
        { message: 'Invalid' }
      );
    });

    test('should call native module confirm without body', () => {
      const wrapper = new EmbeddedComponentBusWrapper(mockNativeModule);
      wrapper.confirm('CardComponent', true);
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(
        'CardComponent',
        true,
        undefined
      );
    });
  });
});
