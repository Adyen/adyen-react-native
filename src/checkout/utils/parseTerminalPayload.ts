//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { PaymentResult, SessionsResult } from '../../core';
import { isRecord } from './isRecord';

/** Parses a native JSON payload. An absent payload is an empty object. */
export const parsePayload = <T>(payloadJson?: string): T =>
  (payloadJson ? JSON.parse(payloadJson) : {}) as T;

/** Parses a session completion payload, which must carry its session ID and result code. */
export const parseSessionResult = (payloadJson?: string): SessionsResult => {
  const payload = parsePayload<unknown>(payloadJson);
  if (
    !isRecord(payload) ||
    typeof payload.sessionId !== 'string' ||
    typeof payload.resultCode !== 'string'
  ) {
    throw new Error('Invalid session terminal payload');
  }
  return payload as unknown as SessionsResult;
};

/** Parses an advanced-flow completion payload. */
export const parsePaymentResult = (payloadJson?: string): PaymentResult => {
  const payload = parsePayload<unknown>(payloadJson);
  if (!isRecord(payload)) {
    throw new Error('Invalid advanced terminal payload');
  }
  return payload as PaymentResult;
};
