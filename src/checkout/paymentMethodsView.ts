//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  CheckoutPaymentMethod,
  PaymentMethodList,
  PaymentMethodsView,
  StoredPaymentMethod,
} from '../core';
import { isRecord } from './utils/isRecord';

const INVALID_SNAPSHOT = { code: 'invalidConfiguration', phase: 'setup' };

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function entriesOf(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw INVALID_SNAPSHOT;
  return value;
}

function createList<T>(items: readonly T[]): PaymentMethodList<T> {
  const entries = Object.freeze([...items]);
  return Object.freeze({
    length: entries.length,
    [Symbol.iterator]: () => entries[Symbol.iterator](),
    first: (predicate?: (paymentMethod: T) => boolean) =>
      predicate ? entries.find(predicate) : entries[0],
  });
}

/**
 * Builds the immutable grouped snapshot published by a checkout.
 *
 * Every entry must carry a non-empty identifier that is unique across both groups, because
 * commands resolve payment methods by identifier alone. A snapshot that violates this is
 * rejected rather than published with ambiguous identities.
 */
export function createPaymentMethodsView(
  paymentMethodsJson: string
): PaymentMethodsView {
  let payload: unknown;
  try {
    payload = JSON.parse(paymentMethodsJson);
  } catch {
    throw INVALID_SNAPSHOT;
  }
  if (!isRecord(payload)) throw INVALID_SNAPSHOT;

  const regular = entriesOf(payload.paymentMethods);
  const stored = entriesOf(payload.storedPaymentMethods);
  const identifiers = new Set<string>();
  for (const entry of [...regular, ...stored]) {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      entry.id.trim().length === 0 ||
      identifiers.has(entry.id)
    ) {
      throw INVALID_SNAPSHOT;
    }
    identifiers.add(entry.id);
  }

  deepFreeze(payload);
  return Object.freeze({
    regular: createList(regular as CheckoutPaymentMethod[]),
    stored: createList(stored as StoredPaymentMethod[]),
  });
}
