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
  PaymentAdditionalResultHandler,
  PaymentDetailsData,
  PaymentMethodData,
  PaymentResultHandler,
  PaymentSubmitResultHandler,
  SessionCallbacks,
  SessionsResult,
} from '../types';

// These tests pin the redesigned callback/handler contracts. The interfaces are
// typed at the declaration sites below (so the shapes are exercised through the
// type system) and their wiring is verified at runtime.

describe('callback handler types', () => {
  describe('PaymentSubmitResultHandler', () => {
    test('supports action, completion and retry (advanced onSubmit)', () => {
      const action = jest.fn();
      const completion = jest.fn();
      const retry = jest.fn();
      const handler: PaymentSubmitResultHandler = { action, completion, retry };

      const paymentAction = {
        type: 'redirect',
        paymentMethodType: 'ideal',
      } as PaymentAction;
      handler.action(paymentAction);
      handler.completion('Authorised');
      handler.retry('try again');

      expect(action).toHaveBeenCalledWith(paymentAction);
      expect(completion).toHaveBeenCalledWith('Authorised');
      expect(retry).toHaveBeenCalledWith('try again');
    });
  });

  describe('PaymentAdditionalResultHandler', () => {
    test('supports completion only (advanced onAdditionalDetails)', () => {
      const completion = jest.fn();
      const handler: PaymentAdditionalResultHandler = { completion };

      handler.completion('Authorised');

      expect(completion).toHaveBeenCalledWith('Authorised');
      expect(Object.keys(handler)).toEqual(['completion']);
      expect('action' in handler).toBe(false);
      expect('retry' in handler).toBe(false);
    });
  });

  describe('PaymentResultHandler', () => {
    test('supports completion only (session flow and error callbacks)', () => {
      const completion = jest.fn();
      const handler: PaymentResultHandler = { completion };

      handler.completion('Refused');

      expect(completion).toHaveBeenCalledWith('Refused');
      expect(Object.keys(handler)).toEqual(['completion']);
      expect('action' in handler).toBe(false);
      expect('retry' in handler).toBe(false);
    });
  });

  describe('SessionCallbacks', () => {
    test('onComplete and onError receive a PaymentResultHandler', () => {
      const onComplete = jest.fn();
      const onError = jest.fn();
      const callbacks: SessionCallbacks = { onComplete, onError };

      const handler: PaymentResultHandler = { completion: jest.fn() };
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

      callbacks.onComplete(result, handler);
      callbacks.onError(error, handler);

      expect(onComplete).toHaveBeenCalledWith(result, handler);
      expect(onError).toHaveBeenCalledWith(error, handler);
    });
  });

  describe('AdvancedCallbacks', () => {
    test('onSubmit receives a PaymentSubmitResultHandler that can forward an action', () => {
      const submitHandler: PaymentSubmitResultHandler = {
        action: jest.fn(),
        completion: jest.fn(),
        retry: jest.fn(),
      };
      const onSubmit = jest.fn(
        (_data: PaymentMethodData, component: PaymentSubmitResultHandler) => {
          component.action({ type: 'threeDS2' } as PaymentAction);
        }
      );
      const callbacks: AdvancedCallbacks = {
        onSubmit,
        onAdditionalDetails: jest.fn(),
        onError: jest.fn(),
      };

      const data = { paymentMethod: { type: 'scheme' } } as PaymentMethodData;
      callbacks.onSubmit(data, submitHandler);

      expect(onSubmit).toHaveBeenCalledWith(data, submitHandler);
      expect(submitHandler.action).toHaveBeenCalledWith({ type: 'threeDS2' });
    });

    test('onAdditionalDetails receives a PaymentAdditionalResultHandler (completion only)', () => {
      const additionalHandler: PaymentAdditionalResultHandler = {
        completion: jest.fn(),
      };
      const onAdditionalDetails = jest.fn(
        (
          _data: PaymentDetailsData,
          component: PaymentAdditionalResultHandler
        ) => {
          component.completion('Authorised');
        }
      );
      const callbacks: AdvancedCallbacks = {
        onSubmit: jest.fn(),
        onAdditionalDetails,
        onError: jest.fn(),
      };

      const details = { data: {} } as unknown as PaymentDetailsData;
      callbacks.onAdditionalDetails(details, additionalHandler);

      expect(additionalHandler.completion).toHaveBeenCalledWith('Authorised');
    });

    test('onError receives a PaymentResultHandler', () => {
      const resultHandler: PaymentResultHandler = { completion: jest.fn() };
      const onError = jest.fn(
        (_error: AdyenError, component: PaymentResultHandler) => {
          component.completion('Error');
        }
      );
      const callbacks: AdvancedCallbacks = {
        onSubmit: jest.fn(),
        onAdditionalDetails: jest.fn(),
        onError,
      };

      const error = { message: 'x', errorCode: 'y' } as AdyenError;
      callbacks.onError(error, resultHandler);

      expect(resultHandler.completion).toHaveBeenCalledWith('Error');
    });
  });
});
