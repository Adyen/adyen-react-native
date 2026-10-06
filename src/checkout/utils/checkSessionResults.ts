//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { isOptionalString, isRecord } from './isRecord';

/**
 * Validates the fields native uses to settle a session `onBeforeSubmit` request.
 * The contents of `data` are decoded by native, which ignores fields it cannot read.
 */
export const isBeforeSubmitResult = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  if (value.type === 'abort') {
    return true;
  }
  return (
    value.type === 'proceed' &&
    isRecord(value.data) &&
    isOptionalString(value.sessionData)
  );
};
