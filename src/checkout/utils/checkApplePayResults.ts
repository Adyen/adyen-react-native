//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  ApplePayAuthorizationResult,
  ApplePayCouponCodeResult,
  ApplePayShippingContactResult,
  ApplePayShippingMethodResult,
} from '../../core';
import { isOptionalArrayOf, isRecord } from './isRecord';

/**
 * Summary items and shipping methods need a label, an amount and a known type. Native drops
 * items it cannot read, which would change the totals shown to the shopper, so reject them here.
 */
const isApplePayAmountItem = (item: unknown): boolean =>
  isRecord(item) &&
  typeof item.label === 'string' &&
  (typeof item.amount === 'string' || typeof item.amount === 'number') &&
  (item.type === undefined || item.type === 'pending' || item.type === 'final');

const isApplePayError = (error: unknown): boolean =>
  isRecord(error) &&
  typeof error.type === 'string' &&
  typeof error.message === 'string';

export const isApplePayAuthorizationResult = (
  value: unknown
): value is ApplePayAuthorizationResult =>
  isRecord(value) &&
  (value.status === 'success' || value.status === 'failure') &&
  isOptionalArrayOf(value.errors, isApplePayError);

export const isApplePayShippingContactResult = (
  value: unknown
): value is ApplePayShippingContactResult =>
  isRecord(value) &&
  isOptionalArrayOf(value.paymentSummaryItems, isApplePayAmountItem) &&
  isOptionalArrayOf(value.shippingMethods, isApplePayAmountItem) &&
  isOptionalArrayOf(value.errors, isApplePayError);

export const isApplePayShippingMethodResult = (
  value: unknown
): value is ApplePayShippingMethodResult =>
  isRecord(value) &&
  isOptionalArrayOf(value.paymentSummaryItems, isApplePayAmountItem);

export const isApplePayCouponCodeResult = (
  value: unknown
): value is ApplePayCouponCodeResult => isApplePayShippingContactResult(value);
