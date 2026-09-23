//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  CheckoutError,
  CheckoutErrorCode,
  CheckoutErrorPhase,
} from '../core';

const errorCodes: CheckoutErrorCode[] = [
  'checkoutBusy',
  'operationBusy',
  'staleCheckout',
  'staleRequest',
  'unsupportedCapability',
  'invalidConfiguration',
  'invalidTarget',
  'cancelled',
];

const errorPhases: CheckoutErrorPhase[] = [
  'setup',
  'query',
  'presentation',
  'callback',
  'cleanup',
];

export function asCheckoutError(
  error: unknown,
  fallbackPhase: CheckoutErrorPhase = 'setup'
): CheckoutError {
  const candidate =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : undefined;
  const code = errorCodes.includes(candidate?.code as CheckoutErrorCode)
    ? (candidate?.code as CheckoutErrorCode)
    : 'cancelled';
  const phase = errorPhases.includes(candidate?.phase as CheckoutErrorPhase)
    ? (candidate?.phase as CheckoutErrorPhase)
    : fallbackPhase;
  const message =
    typeof candidate?.message === 'string' ? candidate.message : undefined;
  return message ? { code, phase, message } : { code, phase };
}
