//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { describe, expect, test } from '@jest/globals';
import {
  isAdditionalDetailsResult,
  isPaymentAction,
  isSubmitResult,
} from '../utils/checkAdvancedResults';
import { isBeforeSubmitResult } from '../utils/checkSessionResults';
import {
  isApplePayAuthorizationResult,
  isApplePayShippingContactResult,
  isApplePayShippingMethodResult,
} from '../utils/checkApplePayResults';
import { isAddressLookupItem } from '../utils/checkAddressLookup';
import {
  parsePaymentResult,
  parsePayload,
  parseSessionResult,
} from '../utils/parseTerminalPayload';

describe('advanced results', () => {
  test('passes action fields other than type and paymentMethodType through', () => {
    const action = {
      type: 'redirect',
      paymentMethodType: 'ideal',
      method: 'POST',
      data: { PaReq: 'value' },
    };
    expect(isPaymentAction(action)).toBe(true);
    expect(isSubmitResult({ type: 'action', action })).toBe(true);
  });

  test.each([
    [{ type: 'completed', resultCode: 'Authorised' }, true],
    [{ type: 'retry' }, true],
    [{ type: 'retry', message: 'Try again' }, true],
    [{ type: 'retry', message: 1 }, false],
    [{ type: 'completed' }, false],
    [{ type: 'unknown' }, false],
    [undefined, false],
  ])('validates submit result %j', (value, expected) => {
    expect(isSubmitResult(value)).toBe(expected);
  });

  test('requires a result code for additional details', () => {
    expect(isAdditionalDetailsResult({ resultCode: 'Authorised' })).toBe(true);
    expect(isAdditionalDetailsResult({})).toBe(false);
  });
});

describe('session results', () => {
  test.each([
    [{ type: 'abort' }, true],
    [{ type: 'proceed', data: {} }, true],
    [{ type: 'proceed', data: {}, sessionData: 'data' }, true],
    [{ type: 'proceed' }, false],
    [{ type: 'proceed', data: [] }, false],
    [{ type: 'proceed', data: {}, sessionData: 1 }, false],
  ])('validates before-submit result %j', (value, expected) => {
    expect(isBeforeSubmitResult(value)).toBe(expected);
  });
});

describe('Apple Pay results', () => {
  test('accepts results with valid optional lists', () => {
    expect(
      isApplePayShippingContactResult({
        paymentSummaryItems: [{ label: 'Total', amount: '10.00' }],
        shippingMethods: [{ label: 'Express', amount: 5, type: 'final' }],
        errors: [{ type: 'shippingAddress', message: 'Unsupported' }],
      })
    ).toBe(true);
    expect(isApplePayShippingMethodResult({})).toBe(true);
  });

  test.each([
    [{ paymentSummaryItems: [{ amount: 10 }] }],
    [{ paymentSummaryItems: [{ label: 'Total', amount: true }] }],
    [{ paymentSummaryItems: [{ label: 'Total', amount: 10, type: 'later' }] }],
    [{ shippingMethods: 'Express' }],
    [{ errors: [{ type: 'shippingAddress' }] }],
  ])('rejects shipping contact result %j', (value) => {
    expect(isApplePayShippingContactResult(value)).toBe(false);
  });

  test('requires a known authorization status', () => {
    expect(isApplePayAuthorizationResult({ status: 'success' })).toBe(true);
    expect(isApplePayAuthorizationResult({ status: 'pending' })).toBe(false);
  });
});

describe('address lookup', () => {
  test('requires an id and an address object', () => {
    expect(isAddressLookupItem({ id: '1', address: {} })).toBe(true);
    expect(isAddressLookupItem({ id: '1' })).toBe(false);
  });
});

describe('terminal payloads', () => {
  test('treats an absent payload as an empty object', () => {
    expect(parsePayload(undefined)).toEqual({});
  });

  test('requires session ID and result code for session results', () => {
    expect(
      parseSessionResult('{"sessionId":"id","resultCode":"Authorised"}')
    ).toEqual({ sessionId: 'id', resultCode: 'Authorised' });
    expect(() => parseSessionResult('{"resultCode":"Authorised"}')).toThrow();
  });

  test('requires an object for payment results', () => {
    expect(parsePaymentResult('{"resultCode":"Authorised"}')).toEqual({
      resultCode: 'Authorised',
    });
    expect(() => parsePaymentResult('[]')).toThrow();
  });
});
