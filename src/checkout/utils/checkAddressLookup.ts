//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { AddressLookupItem } from '../../core';
import { isRecord } from './isRecord';

export const isAddressLookupItem = (
  value: unknown
): value is AddressLookupItem =>
  isRecord(value) && typeof value.id === 'string' && isRecord(value.address);
