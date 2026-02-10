import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { DropInWrapper } from '../DropInWrapper';

/** Mock DropInNativeModule */
function createMockDropInModule() {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({ supportedEvents: [] })),
    hide: jest.fn(),
    open: jest.fn(),
    handle: jest.fn(),
    getReturnURL: jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('myapp://checkout'),
    removeStored: jest.fn(),
    update: jest.fn(),
    confirm: jest.fn(),
    provideBalance: jest.fn(),
    provideOrder: jest.fn(),
    providePaymentMethods: jest.fn(),
  } as any;
}

describe('DropInWrapper', () => {
  let mockNativeModule: ReturnType<typeof createMockDropInModule>;

  beforeEach(() => {
    mockNativeModule = createMockDropInModule();
  });

  describe('name', () => {
    test('should return "DropIn"', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      expect(wrapper.name).toBe('DropIn');
    });
  });

  describe('getReturnURL', () => {
    test('should call native module getReturnURL', async () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const result = await wrapper.getReturnURL();
      expect(mockNativeModule.getReturnURL).toHaveBeenCalled();
      expect(result).toBe('myapp://checkout');
    });
  });

  describe('removeStored', () => {
    test('should call native module removeStored with success', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      wrapper.removeStored(true);
      expect(mockNativeModule.removeStored).toHaveBeenCalledWith(true);
    });

    test('should call native module removeStored with failure', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      wrapper.removeStored(false);
      expect(mockNativeModule.removeStored).toHaveBeenCalledWith(false);
    });
  });

  describe('AddressLookup methods', () => {
    test('update should call native module update', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const results = [
        { id: '1', name: 'Address 1' },
        { id: '2', name: 'Address 2' },
      ];
      wrapper.update(results as any);
      expect(mockNativeModule.update).toHaveBeenCalledWith(results);
    });

    test('confirm should call native module confirm with address', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const address = { id: '1', name: 'Test Address' };
      wrapper.confirm(address as any);
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(true, address);
    });

    test('reject should call native module confirm with false', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      wrapper.reject({ message: 'Invalid address' });
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(false, {
        message: 'Invalid address',
      });
    });

    test('reject should call native module confirm without error', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      wrapper.reject();
      expect(mockNativeModule.confirm).toHaveBeenCalledWith(false, undefined);
    });
  });

  describe('PartialPayment methods', () => {
    test('provideBalance should call native module with success', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const balance = { value: 5000, currency: 'EUR' };
      wrapper.provideBalance(true, balance as any, undefined);
      expect(mockNativeModule.provideBalance).toHaveBeenCalledWith(
        true,
        balance,
        undefined
      );
    });

    test('provideBalance should call native module with error', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const error = new Error('Balance check failed');
      wrapper.provideBalance(false, undefined, error);
      expect(mockNativeModule.provideBalance).toHaveBeenCalledWith(
        false,
        undefined,
        error
      );
    });

    test('provideOrder should call native module with success', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const order = { orderData: 'test', pspReference: 'ref123' };
      wrapper.provideOrder(true, order as any, undefined);
      expect(mockNativeModule.provideOrder).toHaveBeenCalledWith(
        true,
        order,
        undefined
      );
    });

    test('provideOrder should call native module with error', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const error = new Error('Order creation failed');
      wrapper.provideOrder(false, undefined, error);
      expect(mockNativeModule.provideOrder).toHaveBeenCalledWith(
        false,
        undefined,
        error
      );
    });

    test('providePaymentMethods should call native module', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const paymentMethods = {
        paymentMethods: [{ type: 'scheme', name: 'Card' }],
      };
      const order = { orderData: 'test', pspReference: 'ref123' };
      wrapper.providePaymentMethods(paymentMethods, order as any);
      expect(mockNativeModule.providePaymentMethods).toHaveBeenCalledWith(
        paymentMethods,
        order
      );
    });

    test('providePaymentMethods should handle undefined order', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const paymentMethods = {
        paymentMethods: [{ type: 'ideal', name: 'iDEAL' }],
      };
      wrapper.providePaymentMethods(paymentMethods, undefined);
      expect(mockNativeModule.providePaymentMethods).toHaveBeenCalledWith(
        paymentMethods,
        undefined
      );
    });
  });

  describe('inherited methods', () => {
    test('handle should call native module handle', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const action = { type: 'redirect', paymentMethodType: 'ideal' };
      wrapper.handle(action);
      expect(mockNativeModule.handle).toHaveBeenCalledWith(action);
    });

    test('open should call native module open', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      const paymentMethods = {
        paymentMethods: [{ type: 'scheme', name: 'Card' }],
      };
      const config = {
        environment: 'test' as const,
        clientKey: 'key',
        countryCode: 'NL',
        returnUrl: 'app://return',
      };
      wrapper.open(paymentMethods, config);
      expect(mockNativeModule.open).toHaveBeenCalledWith(
        paymentMethods,
        config
      );
    });

    test('hide should call native module hide', () => {
      const wrapper = new DropInWrapper(mockNativeModule);
      wrapper.hide(true);
      expect(mockNativeModule.hide).toHaveBeenCalledWith(true, { message: '' });
    });
  });
});
