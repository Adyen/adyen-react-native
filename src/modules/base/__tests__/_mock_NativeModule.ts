import type { NativeModule } from 'react-native';
import type {
  PaymentMethodsResponse,
  Configuration,
  PaymentAction,
} from '../../../core';
import type { BaseNativeModule } from '../ModuleWrapper';
import type { PaymentModule } from '../PaymentComponentWrapper';
import type { ActionHandlingNativeModule } from '../ActionHandlingComponentWrapper';

/**
 * Creates a mock NativeModule for testing
 */
export function createMockNativeModule(): jest.Mocked<NativeModule> {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
}

/**
 * Creates a mock BaseNativeModule for testing ModuleWrapper
 */
export function createMockBaseNativeModule(): jest.Mocked<BaseNativeModule> {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    hide: jest.fn(),
  };
}

/**
 * Creates a mock PaymentModule for testing PaymentComponentWrapper
 */
export function createMockPaymentModule(): jest.Mocked<PaymentModule> {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    hide: jest.fn(),
    open: jest.fn(),
  };
}

/**
 * Creates a mock ActionHandlingNativeModule for testing ActionHandlingComponentWrapper
 */
export function createMockActionHandlingModule(): jest.Mocked<ActionHandlingNativeModule> {
  return {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    hide: jest.fn(),
    open: jest.fn(),
    handle: jest.fn(),
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
