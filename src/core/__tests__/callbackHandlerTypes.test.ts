//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { describe, expect, test, jest } from '@jest/globals';
import type {
  AdvancedCallbacks,
  AdyenError,
  PaymentAction,
  PaymentDetailsData,
  PaymentMethodData,
  SessionCallbacks,
  SessionsResult,
  SubmitResult as SubmitResultType,
  AdditionalDetailsResult as AdditionalDetailsResultType,
  BeforeSubmitResult as BeforeSubmitResultType,
  BeforeSubmitData,
} from '../types';
import {
  SubmitResult,
  AdditionalDetailsResult,
  BeforeSubmitResult,
} from '../types';

// These tests pin the return-based callback contracts. Factory functions are
// verified at runtime and type shapes are exercised through the type system.

describe('callback result types', () => {
  describe('SubmitResult factory', () => {
    test('action() returns correct shape', () => {
      const paymentAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
      } as PaymentAction;
      const result: SubmitResultType = SubmitResult.action(paymentAction);

      expect(result).toEqual({ type: 'action', action: paymentAction });
      expect(result.type).toBe('action');
    });

    test('completed() returns correct shape', () => {
      const result: SubmitResultType = SubmitResult.completed('Authorised');

      expect(result).toEqual({ type: 'completed', resultCode: 'Authorised' });
      expect(result.type).toBe('completed');
    });

    test('retry() returns correct shape with message', () => {
      const result: SubmitResultType = SubmitResult.retry('try again');

      expect(result).toEqual({ type: 'retry', message: 'try again' });
      expect(result.type).toBe('retry');
    });

    test('retry() returns correct shape without message', () => {
      const result: SubmitResultType = SubmitResult.retry();

      expect(result).toEqual({ type: 'retry', message: undefined });
      expect(result.type).toBe('retry');
    });
  });

  describe('AdditionalDetailsResult factory', () => {
    test('has correct shape', () => {
      const result: AdditionalDetailsResultType = { resultCode: 'Authorised' };

      expect(result.resultCode).toBe('Authorised');
    });

    test('completed() returns correct shape', () => {
      const result: AdditionalDetailsResultType =
        AdditionalDetailsResult.completed('Authorised');

      expect(result).toEqual({ resultCode: 'Authorised' });
    });
  });

  describe('BeforeSubmitResult factory', () => {
    test('proceed() returns correct shape', () => {
      const data: BeforeSubmitData = { shopperEmail: 'test@example.com' };
      const result: BeforeSubmitResultType = BeforeSubmitResult.proceed(data);

      expect(result).toEqual({
        type: 'proceed',
        data,
        sessionData: undefined,
      });
    });

    test('proceed() with sessionData returns correct shape', () => {
      const data: BeforeSubmitData = { shopperEmail: 'test@example.com' };
      const result: BeforeSubmitResultType = BeforeSubmitResult.proceed(
        data,
        'session_123'
      );

      expect(result).toEqual({
        type: 'proceed',
        data,
        sessionData: 'session_123',
      });
    });

    test('abort() returns correct shape', () => {
      const result: BeforeSubmitResultType = BeforeSubmitResult.abort();

      expect(result).toEqual({ type: 'abort' });
    });
  });

  describe('SessionCallbacks', () => {
    test('onComplete and onError are terminal (no handler parameter)', () => {
      const onComplete = jest.fn();
      const onError = jest.fn();
      const callbacks: SessionCallbacks = { onComplete, onError };

      const result = {
        sessionId: 'sid',
        sessionResult: 'sr',
        resultCode: 'Authorised',
        sessionData: 'sd',
      } as SessionsResult;
      const error = {
        message: 'boom',
        errorCode: 'unknown',
      } as AdyenError;

      callbacks.onComplete(result);
      callbacks.onError(error);

      expect(onComplete).toHaveBeenCalledWith(result);
      expect(onComplete.mock.calls[0]).toHaveLength(1);
      expect(onError).toHaveBeenCalledWith(error);
      expect(onError.mock.calls[0]).toHaveLength(1);
    });

    test('onBeforeSubmit returns a Promise<BeforeSubmitResult>', async () => {
      const data: BeforeSubmitData = { shopperEmail: 'test@example.com' };
      const callbacks: SessionCallbacks = {
        onComplete: jest.fn(),
        onError: jest.fn(),
        onBeforeSubmit: async (d) => BeforeSubmitResult.proceed(d),
      };

      const result = await callbacks.onBeforeSubmit?.(data);

      expect(result).toEqual({
        type: 'proceed',
        data,
        sessionData: undefined,
      });
    });
  });

  describe('AdvancedCallbacks', () => {
    test('onSubmit returns a Promise<SubmitResult>', async () => {
      const callbacks: AdvancedCallbacks = {
        onSubmit: async (_data: PaymentMethodData) =>
          SubmitResult.action({ type: 'threeDS2' } as PaymentAction),
        onAdditionalDetails: async (_data: PaymentDetailsData) =>
          AdditionalDetailsResult.completed('Authorised'),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      const data = { paymentMethod: { type: 'scheme' } } as PaymentMethodData;
      const result = await callbacks.onSubmit(data);

      expect(result.type).toBe('action');
    });

    test('onAdditionalDetails returns a Promise<AdditionalDetailsResult>', async () => {
      const callbacks: AdvancedCallbacks = {
        onSubmit: async () => SubmitResult.completed('Authorised'),
        onAdditionalDetails: async (_data: PaymentDetailsData) =>
          AdditionalDetailsResult.completed('Authorised'),
        onComplete: jest.fn(),
        onError: jest.fn(),
      };

      const details = { details: {} } as PaymentDetailsData;
      const result = await callbacks.onAdditionalDetails(details);

      expect(result.resultCode).toBe('Authorised');
    });

    test('onComplete and onError are terminal (no handler parameter)', () => {
      const onComplete = jest.fn();
      const onError = jest.fn();
      const callbacks: AdvancedCallbacks = {
        onSubmit: jest.fn<any>(),
        onAdditionalDetails: jest.fn<any>(),
        onComplete,
        onError,
      };

      callbacks.onComplete({ resultCode: 'Authorised' });
      callbacks.onError({ message: 'x', errorCode: 'y' });

      expect(onComplete.mock.calls[0]).toHaveLength(1);
      expect(onError.mock.calls[0]).toHaveLength(1);
    });
  });
});
