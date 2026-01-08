import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { checkPaymentMethodsResponse, checkConfiguration } from '../utils';

describe('checkPaymentMethodsResponse', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  test('should throw Error when paymentMethodsResponse is undefined', () => {
    expect(() => checkPaymentMethodsResponse(undefined)).toThrow(
      'paymentMethodsResponse is undefined'
    );
  });

  test('should throw TypeError when paymentMethodsResponse is a string', () => {
    expect(() => checkPaymentMethodsResponse('invalid' as any)).toThrow(
      'should be an object but a string was provided'
    );
  });

  test('should throw TypeError when paymentMethodsResponse is an array', () => {
    expect(() => checkPaymentMethodsResponse([] as any)).toThrow(
      'should be an object but an array was provided'
    );
  });

  test('should warn when no payment methods are found', () => {
    const warnSpy = jest.spyOn(console, 'warn');
    checkPaymentMethodsResponse({ paymentMethods: [] });
    expect(warnSpy).toHaveBeenCalledWith(
      'paymentMethodsResponse was provided but no payment methods were found.'
    );
  });

  test('should return valid paymentMethodsResponse with paymentMethods', () => {
    const response = {
      paymentMethods: [{ type: 'scheme', name: 'Credit Card' }],
    };
    expect(checkPaymentMethodsResponse(response)).toBe(response);
  });

  test('should return valid paymentMethodsResponse with storedPaymentMethods', () => {
    const response = {
      paymentMethods: [],
      storedPaymentMethods: [{ type: 'scheme', id: '123' }],
    };
    expect(checkPaymentMethodsResponse(response as any)).toBe(response);
  });
});

describe('checkConfiguration', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  const validConfig = {
    environment: 'test' as const,
    clientKey: 'test_ABCDEFGHIJ',
    returnUrl: 'myapp://checkout',
    countryCode: 'NL',
  };

  test('should throw Error when returnUrl is missing', () => {
    const config = { ...validConfig, returnUrl: undefined } as any;
    expect(() => checkConfiguration(config)).toThrow(
      'Parameter returnUrl is required'
    );
  });

  test('should throw Error when clientKey is missing', () => {
    const config = { ...validConfig, clientKey: undefined } as any;
    expect(() => checkConfiguration(config)).toThrow(
      'Parameter clientKey is required'
    );
  });

  test('should throw Error when clientKey is invalid', () => {
    const config = { ...validConfig, clientKey: 'invalid_key' };
    expect(() => checkConfiguration(config)).toThrow('Invalid client key');
  });

  test('should warn when returnUrl starts with http', () => {
    const warnSpy = jest.spyOn(console, 'warn');
    const config = { ...validConfig, returnUrl: 'https://example.com' };
    checkConfiguration(config);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not a Custom URL scheme')
    );
  });

  test('should warn when amount is set but countryCode is missing', () => {
    const warnSpy = jest.spyOn(console, 'warn');
    const config = {
      ...validConfig,
      countryCode: undefined,
      amount: { value: 1000, currency: 'EUR' },
    } as any;
    checkConfiguration(config);
    expect(warnSpy).toHaveBeenCalledWith(
      'To show the amount on the Pay button both amount and countryCode must be set.'
    );
  });

  test('should throw Error when currency code is invalid', () => {
    const config = {
      ...validConfig,
      amount: { value: 1000, currency: 'EURO' },
    };
    expect(() => checkConfiguration(config)).toThrow('Invalid currency code');
  });

  test('should throw Error when country code is invalid', () => {
    const config = { ...validConfig, countryCode: 'NLD' };
    expect(() => checkConfiguration(config)).toThrow('Invalid country code');
  });

  test('should pass with valid configuration', () => {
    expect(() => checkConfiguration(validConfig)).not.toThrow();
  });

  test('should pass with valid configuration including amount', () => {
    const config = {
      ...validConfig,
      amount: { value: 1000, currency: 'EUR' },
    };
    expect(() => checkConfiguration(config)).not.toThrow();
  });
});
