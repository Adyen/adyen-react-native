import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { ComponentProxy } from '../ComponentProxy';
import { Event } from '../../../core';

function createMockComponentWrapper() {
  return {
    name: 'AdyenComponent',
    isSupported: jest.fn().mockReturnValue(false),
    eventEmitterTarget: { addListener: jest.fn(), removeListeners: jest.fn() },
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    action: jest.fn(),
    completion: jest.fn(),
    retry: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
  } as any;
}

describe('ComponentProxy', () => {
  let mockWrapper: ReturnType<typeof createMockComponentWrapper>;

  beforeEach(() => {
    mockWrapper = createMockComponentWrapper();
  });

  describe('constructor', () => {
    test('should expose viewId', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      expect(proxy.viewId).toBe('CardComponent');
    });
  });

  describe('eventEmitterTarget', () => {
    test('should delegate to wrapper eventEmitterTarget', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      expect(proxy.eventEmitterTarget).toBe(mockWrapper.eventEmitterTarget);
    });
  });

  describe('isSupported', () => {
    test('should delegate to wrapper isSupported', () => {
      mockWrapper.isSupported.mockReturnValue(true);
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      const result = proxy.isSupported(Event.onError);
      expect(mockWrapper.isSupported).toHaveBeenCalledWith(Event.onError);
      expect(result).toBe(true);
    });

    test('should return false when wrapper reports unsupported', () => {
      mockWrapper.isSupported.mockReturnValue(false);
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      expect(proxy.isSupported(Event.onSubmit)).toBe(false);
    });
  });

  describe('action', () => {
    test('should call wrapper action with bound viewId and action', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      const paymentAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
      } as any;
      proxy.action(paymentAction);
      expect(mockWrapper.action).toHaveBeenCalledWith(
        'CardComponent',
        paymentAction
      );
    });
  });

  describe('completion', () => {
    test('should call wrapper completion with bound viewId and result code', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      proxy.completion('Authorised');
      expect(mockWrapper.completion).toHaveBeenCalledWith(
        'CardComponent',
        'Authorised'
      );
    });

    test('should call wrapper completion with Refused', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      proxy.completion('Refused');
      expect(mockWrapper.completion).toHaveBeenCalledWith(
        'CardComponent',
        'Refused'
      );
    });
  });

  describe('retry', () => {
    test('should call wrapper retry with bound viewId and message', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      proxy.retry('Payment failed');
      expect(mockWrapper.retry).toHaveBeenCalledWith(
        'CardComponent',
        'Payment failed'
      );
    });

    test('should call wrapper retry with bound viewId and no message', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      proxy.retry();
      expect(mockWrapper.retry).toHaveBeenCalledWith(
        'CardComponent',
        undefined
      );
    });
  });

  describe('update', () => {
    test('should call wrapper update with bound viewId and results', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      const results = [{ id: '1', name: 'Street 1' }] as any[];
      proxy.update(results);
      expect(mockWrapper.update).toHaveBeenCalledWith('CardComponent', results);
    });
  });

  describe('confirm', () => {
    test('should call wrapper confirm with success true and address', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
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
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      proxy.reject({ message: 'Lookup failed' });
      expect(mockWrapper.confirm).toHaveBeenCalledWith('CardComponent', false, {
        message: 'Lookup failed',
      });
    });

    test('should call wrapper confirm with success false and no error', () => {
      const proxy = new ComponentProxy(mockWrapper, 'CardComponent');
      proxy.reject();
      expect(mockWrapper.confirm).toHaveBeenCalledWith(
        'CardComponent',
        false,
        undefined
      );
    });
  });

  describe('viewId binding', () => {
    test('different proxies on same wrapper route to their own viewId', () => {
      const proxyA = new ComponentProxy(mockWrapper, 'ComponentA');
      const proxyB = new ComponentProxy(mockWrapper, 'ComponentB');
      const paymentAction = { type: 'threeDS2' } as any;

      proxyA.action(paymentAction);
      proxyB.action(paymentAction);

      expect(mockWrapper.action).toHaveBeenNthCalledWith(
        1,
        'ComponentA',
        paymentAction
      );
      expect(mockWrapper.action).toHaveBeenNthCalledWith(
        2,
        'ComponentB',
        paymentAction
      );
    });
  });
});
