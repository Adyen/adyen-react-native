import { describe, expect, test, jest } from '@jest/globals';
import { mockPaymentMethodsResponse } from './_mock_NativeModule';

// Mock native modules before importing getWrapper
jest.mock('react-native', () => ({
  Platform: {
    select: (obj: { ios?: string; default?: string }) => obj.default ?? '',
  },
  NativeModules: {
    AdyenDropIn: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      hide: jest.fn(),
      open: jest.fn(),
      handle: jest.fn(),
      getReturnURL: jest.fn(),
      removeStored: jest.fn(),
      update: jest.fn(),
      confirm: jest.fn(),
      provideBalance: jest.fn(),
      provideOrder: jest.fn(),
      providePaymentMethods: jest.fn(),
    },
    AdyenApplePay: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      hide: jest.fn(),
      open: jest.fn(),
      isAvailable: jest.fn(),
    },
    AdyenGooglePay: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      hide: jest.fn(),
      open: jest.fn(),
      handle: jest.fn(),
      isAvailable: jest.fn(),
    },
    AdyenInstant: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      hide: jest.fn(),
      open: jest.fn(),
      handle: jest.fn(),
    },
    AdyenAction: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
      hide: jest.fn(),
      handle: jest.fn(),
      getConstants: () => ({ threeDS2SdkVersion: '2.0.0' }),
    },
  },
}));

import { getWrapper } from '../getWrapper';

describe('getWrapper', () => {
  describe('dropin variants', () => {
    test('should return DropInWrapper for "dropin"', () => {
      const result = getWrapper('dropin', mockPaymentMethodsResponse);
      expect(result.nativeComponent.name).toBe('DropIn');
      expect(result.paymentMethod).toBeUndefined();
    });

    test('should return DropInWrapper for "dropIn"', () => {
      const result = getWrapper('dropIn', mockPaymentMethodsResponse);
      expect(result.nativeComponent.name).toBe('DropIn');
    });

    test('should return DropInWrapper for "drop-in"', () => {
      const result = getWrapper('drop-in', mockPaymentMethodsResponse);
      expect(result.nativeComponent.name).toBe('DropIn');
    });

    test('should return DropInWrapper for "adyendropin"', () => {
      const result = getWrapper('adyendropin', mockPaymentMethodsResponse);
      expect(result.nativeComponent.name).toBe('DropIn');
    });
  });

  describe('applepay', () => {
    test('should return ApplePayWrapper for "applepay"', () => {
      const result = getWrapper('applepay', mockPaymentMethodsResponse);
      expect(result.nativeComponent.name).toBe('ApplePay');
      expect(result.paymentMethod).toBeUndefined();
    });
  });

  describe('googlepay variants', () => {
    test('should return GooglePayWrapper for "googlepay"', () => {
      const result = getWrapper('googlepay', mockPaymentMethodsResponse);
      expect(result.nativeComponent.name).toBe('GooglePay');
      expect(result.paymentMethod).toBeUndefined();
    });

    test('should return GooglePayWrapper for "paywithgoogle"', () => {
      const result = getWrapper('paywithgoogle', mockPaymentMethodsResponse);
      expect(result.nativeComponent.name).toBe('GooglePay');
    });
  });

  describe('payment method lookup', () => {
    test('should return InstantWrapper for unknown payment method in list', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'ideal', name: 'iDEAL' }],
      };
      const result = getWrapper('ideal', paymentMethods);
      expect(result.nativeComponent.name).toBe('Instant');
      expect(result.paymentMethod).toEqual({ type: 'ideal', name: 'iDEAL' });
    });

    test('should return DropInWrapper for scheme payment method', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'scheme', name: 'Credit Card' }],
      };
      const result = getWrapper('scheme', paymentMethods);
      expect(result.nativeComponent.name).toBe('DropIn');
      expect(result.paymentMethod).toEqual({
        type: 'scheme',
        name: 'Credit Card',
      });
    });

    test('should return DropInWrapper for bcmc payment method', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'bcmc', name: 'Bancontact' }],
      };
      const result = getWrapper('bcmc', paymentMethods);
      expect(result.nativeComponent.name).toBe('DropIn');
      expect(result.paymentMethod).toEqual({
        type: 'bcmc',
        name: 'Bancontact',
      });
    });
  });

  describe('error handling', () => {
    test('should throw error for unknown payment method not in list', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'ideal', name: 'iDEAL' }],
      };
      expect(() => getWrapper('unknown', paymentMethods)).toThrow(
        /Unknown payment method/
      );
    });

    test('should throw error for empty payment methods', () => {
      const paymentMethods = { paymentMethods: [] };
      expect(() => getWrapper('ideal', paymentMethods)).toThrow(
        /Unknown payment method/
      );
    });

    test('should throw error for unsupported payment method', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'wechatpaySDK', name: 'WeChat Pay' }],
      };
      expect(() => getWrapper('wechatpaySDK', paymentMethods)).toThrow(
        /Unsupported payment method/
      );
    });
  });

  describe('address components', () => {
    test('should return DropInWrapper for scheme with address lookup', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'scheme', name: 'Credit Card' }],
      };
      const result = getWrapper('scheme', paymentMethods);
      expect(result.nativeComponent.name).toBe('DropIn');
    });
  });

  describe('native components', () => {
    test('should return DropInWrapper for scheme (native component)', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'scheme', name: 'Credit Card' }],
      };
      const result = getWrapper('scheme', paymentMethods);
      expect(result.nativeComponent.name).toBe('DropIn');
    });

    test('should return DropInWrapper for sepadirectdebit', () => {
      const paymentMethods = {
        paymentMethods: [{ type: 'sepadirectdebit', name: 'SEPA' }],
      };
      const result = getWrapper('sepadirectdebit', paymentMethods);
      expect(result.nativeComponent.name).toBe('DropIn');
    });
  });

  describe('wrapper capabilities', () => {
    test('returned wrapper should have open method', () => {
      const result = getWrapper('dropin', mockPaymentMethodsResponse);
      expect(typeof result.nativeComponent.open).toBe('function');
    });

    test('returned wrapper should have hide method', () => {
      const result = getWrapper('dropin', mockPaymentMethodsResponse);
      expect(typeof result.nativeComponent.hide).toBe('function');
    });

    test('returned wrapper should have isSupported method', () => {
      const result = getWrapper('dropin', mockPaymentMethodsResponse);
      expect(typeof result.nativeComponent.isSupported).toBe('function');
    });
  });
});
