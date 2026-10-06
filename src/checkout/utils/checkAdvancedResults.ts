//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { PaymentAction } from '../../core';
import { isOptionalString, isRecord } from './isRecord';

/** Native requires both fields to decode an action. Other fields pass through unchanged. */
export const isPaymentAction = (value: unknown): value is PaymentAction =>
  isRecord(value) &&
  typeof value.type === 'string' &&
  typeof value.paymentMethodType === 'string';

/** Validates the fields native uses to settle an advanced `onSubmit` request. */
export const isSubmitResult = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.type) {
    case 'action':
      return isPaymentAction(value.action);
    case 'completed':
      return typeof value.resultCode === 'string';
    case 'retry':
      return isOptionalString(value.message);
    default:
      return false;
  }
};

/** Validates the field native uses to settle an advanced `onAdditionalDetails` request. */
export const isAdditionalDetailsResult = (value: unknown): boolean =>
  isRecord(value) && typeof value.resultCode === 'string';
