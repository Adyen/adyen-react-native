import type { NativeModule } from 'react-native';
import type {
  PaymentMethodsResponse,
  Configuration,
  PaymentAction,
} from '../../../core';

/**
 * Creates a mock NativeModule for testing
 */
export function createMockNativeModule(
  supportedEvents: string[] = []
): jest.Mocked<
  NativeModule & { getConstants: () => { supportedEvents: string[] } }
> {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getConstants: jest.fn(() => ({ supportedEvents })),
  };
}

/**
 * Sample payment methods response for testing
 */
export const mockPaymentMethodsResponse: PaymentMethodsResponse = {
  paymentMethods: [
    { type: 'scheme', name: 'Credit Card' },
    { type: 'ideal', name: 'iDEAL' },
    { type: 'paypal', name: 'PayPal' },
    { type: 'applepay', name: 'Apple Pay' },
    { type: 'googlepay', name: 'Google Pay' },
  ],
};

/**
 * Sample configuration for testing
 */
export const mockConfiguration: Configuration = {
  environment: 'test',
  clientKey: 'test_client_key',
  countryCode: 'NL',
  amount: { value: 1000, currency: 'EUR' },
  returnUrl: 'myapp://checkout',
};

/**
 * Sample payment action for testing
 */
export const mockPaymentAction: PaymentAction = {
  type: 'redirect',
  paymentMethodType: 'ideal',
  url: 'https://example.com/redirect',
};
