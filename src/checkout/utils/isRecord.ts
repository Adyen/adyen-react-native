//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

/** Whether `value` is a plain JSON object (not `null` or an array). */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Whether `value` is absent or a string. */
export const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === 'string';

/** Whether `value` is absent or an array whose items all satisfy `isItem`. */
export const isOptionalArrayOf = (
  value: unknown,
  isItem: (item: unknown) => boolean
): boolean =>
  value === undefined || (Array.isArray(value) && value.every(isItem));
