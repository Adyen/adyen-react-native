import type { NativeModule } from 'react-native';
import type {
  PaymentMethodsResponse,
  Configuration,
  PaymentAction,
} from '../../../core';

export function createMockNativeModule(): jest.Mocked<NativeModule> {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
}

export const mockPaymentMethodsResponse: PaymentMethodsResponse = {
  paymentMethods: [
    { type: 'scheme', name: 'Credit Card' },
    { type: 'ideal', name: 'iDEAL' },
    { type: 'paypal', name: 'PayPal' },
    { type: 'applepay', name: 'Apple Pay' },
    { type: 'googlepay', name: 'Google Pay' },
  ],
};

export const mockConfiguration: Configuration = {
  environment: 'test',
  clientKey: 'test_client_key',
  countryCode: 'NL',
  amount: { value: 1000, currency: 'EUR' },
  returnUrl: 'myapp://checkout',
};

export const mockPaymentAction: PaymentAction = {
  type: 'redirect',
  paymentMethodType: 'ideal',
  url: 'https://example.com/redirect',
};
