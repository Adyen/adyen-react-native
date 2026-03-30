import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { EmbeddedComponentProxy } from '../EmbeddedComponentProxy';
import { Event } from '../../../core';

function createMockBusWrapper() {
  return {
    name: 'AdyenComponentBus',
    isSupported: jest.fn().mockReturnValue(false),
    eventEmitterTarget: { addListener: jest.fn(), removeListeners: jest.fn() },
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    handle: jest.fn(),
    hide: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
  } as any;
}

describe('EmbeddedComponentProxy', () => {
  let mockWrapper: ReturnType<typeof createMockBusWrapper>;

  beforeEach(() => {
    mockWrapper = createMockBusWrapper();
  });

  describe('constructor', () => {
    test('should expose componentType', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      expect(proxy.componentType).toBe('CardComponent');
    });
  });

  describe('eventEmitterTarget', () => {
    test('should delegate to wrapper eventEmitterTarget', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      expect(proxy.eventEmitterTarget).toBe(mockWrapper.eventEmitterTarget);
    });
  });

  describe('isSupported', () => {
    test('should delegate to wrapper isSupported', () => {
      mockWrapper.isSupported.mockReturnValue(true);
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      const result = proxy.isSupported(Event.onError);
      expect(mockWrapper.isSupported).toHaveBeenCalledWith(Event.onError);
      expect(result).toBe(true);
    });

    test('should return false when wrapper reports unsupported', () => {
      mockWrapper.isSupported.mockReturnValue(false);
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      expect(proxy.isSupported(Event.onSubmit)).toBe(false);
    });
  });

  describe('handle', () => {
    test('should call wrapper handle with bound componentType and action', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      const action = { type: 'redirect', paymentMethodType: 'ideal' } as any;
      proxy.handle(action);
      expect(mockWrapper.handle).toHaveBeenCalledWith('CardComponent', action);
    });
  });

  describe('hide', () => {
    test('should call wrapper hide with success true and provided message', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      proxy.hide(true, { message: 'Payment complete' });
      expect(mockWrapper.hide).toHaveBeenCalledWith('CardComponent', true, {
        message: 'Payment complete',
      });
    });

    test('should call wrapper hide with empty message when option is undefined', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      proxy.hide(false);
      expect(mockWrapper.hide).toHaveBeenCalledWith('CardComponent', false, {
        message: '',
      });
    });

    test('should call wrapper hide with empty message when option.message is undefined', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      proxy.hide(true, {});
      expect(mockWrapper.hide).toHaveBeenCalledWith('CardComponent', true, {
        message: '',
      });
    });
  });

  describe('update', () => {
    test('should call wrapper update with bound componentType and results', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      const results = [{ id: '1', name: 'Street 1' }] as any[];
      proxy.update(results);
      expect(mockWrapper.update).toHaveBeenCalledWith('CardComponent', results);
    });
  });

  describe('confirm', () => {
    test('should call wrapper confirm with success true and address', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      const address = { id: '1', name: 'Main St' } as any;
      proxy.confirm(address);
      expect(mockWrapper.confirm).toHaveBeenCalledWith(
        'CardComponent',
        true,
        address
      );
    });
  });

  describe('reject', () => {
    test('should call wrapper confirm with success false and error', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      proxy.reject({ message: 'Lookup failed' });
      expect(mockWrapper.confirm).toHaveBeenCalledWith('CardComponent', false, {
        message: 'Lookup failed',
      });
    });

    test('should call wrapper confirm with success false and no error', () => {
      const proxy = new EmbeddedComponentProxy(mockWrapper, 'CardComponent');
      proxy.reject();
      expect(mockWrapper.confirm).toHaveBeenCalledWith(
        'CardComponent',
        false,
        undefined
      );
    });
  });

  describe('componentType binding', () => {
    test('different proxies on same wrapper route to their own componentType', () => {
      const proxyA = new EmbeddedComponentProxy(mockWrapper, 'ComponentA');
      const proxyB = new EmbeddedComponentProxy(mockWrapper, 'ComponentB');
      const action = { type: 'threeDS2' } as any;

      proxyA.handle(action);
      proxyB.handle(action);

      expect(mockWrapper.handle).toHaveBeenNthCalledWith(
        1,
        'ComponentA',
        action
      );
      expect(mockWrapper.handle).toHaveBeenNthCalledWith(
        2,
        'ComponentB',
        action
      );
    });
  });
});
