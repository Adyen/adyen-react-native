//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { AdvancedPayment, SubmitResult } from '../core';
import { AdyenContext } from '../modules/context/ContextModule';
import { AdyenDropIn } from '../modules/dropin/AdyenDropIn';
import { PRESENTER_CONTEXT, VIEW_KEY_PREFIX } from './constants';
import type { Tagged } from './types';

/**
 * Presenter identity, and the routing it drives.
 *
 * A presenter is anything that can drive a payment on the shared checkout: Drop-in, an embedded
 * `<AdyenComponent>` view, or the headless context flow behind `checkout.submit(type)`. All three
 * emit the same event names, because event names are delivered globally through
 * `RCTDeviceEventEmitter` on both platforms — a per-module emitter does not isolate delivery, it
 * only does listener bookkeeping. Identity therefore travels inside the payload.
 */

/** Subscription key for an embedded view's listeners. */
export const viewKey = (viewId: string): string =>
  `${VIEW_KEY_PREFIX}${viewId}`;

/** The view id behind a subscription key, or `undefined` if the key is not a view's. */
export const viewIdOf = (key: string): string | undefined =>
  key.startsWith(VIEW_KEY_PREFIX)
    ? key.slice(VIEW_KEY_PREFIX.length)
    : undefined;

/**
 * Removes the transport tag before a payload reaches a merchant callback.
 *
 * This is correctness, not cosmetics: the additional-details payload *is* the request body the
 * merchant posts to `/payments/details`, so a stray `source` field would be sent to the API.
 */
export function stripTag<T>(raw: Tagged<T>): T {
  const rest = { ...(raw as Tagged<Record<string, unknown>>) };
  delete rest.source;
  return rest as T;
}

/**
 * Picks the module that owns the continuation waiting on this result.
 *
 * Drop-in, the headless context flow and embedded views all emit the same event names, so without
 * the tag a result can be sent to a module that has nothing pending — which is why a headless
 * `checkout.submit()` never used to complete.
 */
export function resolveTarget(raw: unknown): AdvancedPayment {
  const source = (raw as Tagged<unknown> | undefined)?.source;
  return source === PRESENTER_CONTEXT ? AdyenContext : AdyenDropIn;
}

/**
 * Dispatch a {@link SubmitResult} to the presenter that emitted the submit event.
 */
export function dispatchSubmitResult(
  result: SubmitResult,
  target: AdvancedPayment
): void {
  switch (result.type) {
    case 'action':
      target.action(result.action);
      break;
    case 'completed':
      target.completion(result.resultCode);
      break;
    case 'retry':
      target.retry(result.message);
      break;
  }
}
