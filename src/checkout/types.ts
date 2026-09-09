//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type { EmitterSubscription } from 'react-native';
import type {
  AdvancedCallbacks,
  Configuration,
  SessionCallbacks,
} from '../core';
import type { EventHandlerRefs } from './utils/startEventListeners';

/**
 * Lifecycle operations a `Checkout` handle delegates back to its owning `AdyenCheckout`.
 *
 * Keeps the handle free of lifecycle state: it asks its host whether it is still the active
 * checkout, and the host decides what teardown means.
 */
export interface CheckoutHost {
  /** Whether the checkout this handle belongs to is still the active one. */
  isActive(): boolean;
  invalidate(): void;
}

/**
 * Handlers to point the per-view event handler refs at.
 *
 * Every entry is optional: omitting one clears it, which is both how a flow declares it does not
 * handle an event and how teardown clears everything. Signatures are derived from
 * {@link EventHandlerRefs} so they cannot drift from what the listeners expect.
 */
export interface EventHandlers {
  onSubmit?: EventHandlerRefs['onSubmit']['current'];
  onAdditionalDetails?: EventHandlerRefs['onAdditionalDetails']['current'];
  onComplete?: EventHandlerRefs['onComplete']['current'];
  onError?: EventHandlerRefs['onError']['current'];
}

/**
 * Mutable state backing the single active checkout.
 *
 * Held privately by `AdyenCheckout`; the shape lives here so the class body stays readable.
 */
export interface CheckoutRuntime {
  configuration: Configuration | null;
  sessionCallbacks: SessionCallbacks | null;
  advancedCallbacks: AdvancedCallbacks | null;
  /** Listener bags, keyed by `DROP_IN_KEY`. */
  subscriptions: Map<string, EmitterSubscription[]>;
  isCleanedUp: boolean;
  /** Set once a terminal event has been handled, so duplicates are ignored. */
  hasHandledTerminalEvent: boolean;
  /** Read at event time, so views subscribed before a re-setup see the new callbacks. */
  eventHandlerRefs: EventHandlerRefs;
}
