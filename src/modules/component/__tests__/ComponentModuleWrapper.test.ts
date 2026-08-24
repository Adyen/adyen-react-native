import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { ComponentModuleWrapper } from '../ComponentModuleWrapper';
import { Event } from '../../../core';

function createMockComponentModule(supportedEvents: string[] = []) {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({ supportedEvents })),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    action: jest.fn(),
    completion: jest.fn(),
    retry: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
  };
}

describe('ComponentModuleWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockComponentModule>;

  beforeEach(() => {
    mockNativeModule = createMockComponentModule();
  });

  describe('name', () => {
    test('should return "AdyenComponent"', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      expect(wrapper.name).toBe('AdyenComponent');
    });
  });

  describe('eventEmitterTarget', () => {
    test('should return the native module', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      expect(wrapper.eventEmitterTarget).toBe(mockNativeModule);
    });
  });

  describe('isSupported', () => {
    test('should return true for events listed in getConstants', () => {
      const module = createMockComponentModule([Event.onError, Event.onSubmit]);
      const wrapper = new ComponentModuleWrapper(module);
      expect(wrapper.isSupported(Event.onError)).toBe(true);
      expect(wrapper.isSupported(Event.onSubmit)).toBe(true);
    });

    test('should return false for events not listed in getConstants', () => {
      const module = createMockComponentModule([Event.onError]);
      const wrapper = new ComponentModuleWrapper(module);
      expect(wrapper.isSupported(Event.onComplete)).toBe(false);
    });

    test('should return false when no supported events', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      expect(wrapper.isSupported(Event.onError)).toBe(false);
    });
  });

  describe('subscribe', () => {
    test('should call native module subscribe with viewId', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      wrapper.subscribe('CardComponent');
      expect(mockNativeModule.subscribe).toHaveBeenCalledWith('CardComponent');
    });
  });

  describe('unsubscribe', () => {
    test('should call native module unsubscribe with viewId', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      wrapper.unsubscribe('CardComponent');
      expect(mockNativeModule.unsubscribe).toHaveBeenCalledWith(
        'CardComponent'
      );
    });
  });

  describe('action', () => {
    test('should call native module action with viewId and action', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      const paymentAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
      } as any;
      wrapper.action('CardComponent', paymentAction);
      expect(mockNativeModule.action).toHaveBeenCalledWith(
        'CardComponent',
        paymentAction
      );
    });
  });

  describe('completion', () => {
    test('should call native module completion with viewId and result code', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      wrapper.completion('CardComponent', 'Authorised');
      expect(mockNativeModule.completion).toHaveBeenCalledWith(
        'CardComponent',
        'Authorised'
      );
    });
  });

  describe('retry', () => {
    test('should call native module retry with viewId and message', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      wrapper.retry('CardComponent', 'Try again');
      expect(mockNativeModule.retry).toHaveBeenCalledWith(
        'CardComponent',
        'Try again'
      );
    });

    test('should call native module retry with viewId and no message', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      wrapper.retry('CardComponent');
      expect(mockNativeModule.retry).toHaveBeenCalledWith(
        'CardComponent',
        undefined
      );
    });
  });

  describe('update', () => {
    test('should call native module update with viewId and results', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
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
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      const address = { id: '1', name: 'Main St' } as any;
      wrapper.confirm('CardComponent', true, address);
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(
        'CardComponent',
        true,
        address
      );
    });

    test('should call native module confirm with success false and error body', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      wrapper.confirm('CardComponent', false, { message: 'Invalid' });
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(
        'CardComponent',
        false,
        { message: 'Invalid' }
      );
    });

    test('should call native module confirm without body', () => {
      const wrapper = new ComponentModuleWrapper(mockNativeModule);
      wrapper.confirm('CardComponent', true);
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(
        'CardComponent',
        true,
        undefined
      );
    });
  });
});
