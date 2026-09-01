//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

/**
 * Presenter id emitted by the headless context flow.
 *
 * Mirrors `EventSource.CONTEXT` on Android and `EventSource.context` on iOS — keep the three in
 * sync. An absent tag means Drop-in, kept as a compatibility fallback.
 */
export const PRESENTER_CONTEXT = 'context';

// Listener bags are keyed by presenter, so Drop-in and every embedded view live in one map.
// The `view:` prefix keeps them apart, which teardown needs: only a view also has a native
// subscription to detach.

/** Subscription key for Drop-in's listeners. */
export const DROP_IN_KEY = 'dropin';

/** Prefix marking a subscription key as an embedded view's. */
export const VIEW_KEY_PREFIX = 'view:';
