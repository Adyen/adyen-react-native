//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { TurboModuleRegistry } from 'react-native';
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';

/**
 * Native checkout identity and data snapshot returned only to the internal JS facade.
 *
 * The facade must not surface `checkoutId` to merchants. Polymorphic payment methods remain
 * serialized because their shape evolves with the Checkout API. Every entry in
 * `paymentMethodsJson` carries an `id`: native mints one for each regular payment method, and
 * stored payment methods keep their API identifier. Commands address payment methods by this id.
 */
export type CheckoutDescriptor = {
  checkoutId: string;
  flow: CheckoutFlow;
  paymentMethodsJson: string;
};

export type CheckoutFlow = 'sessions' | 'advanced';

/**
 * Native result of eagerly creating one payment-method controller.
 *
 * `controllerId` is an opaque native registry identity that must never reach merchants.
 * `requiresUserInteraction` is resolved once, from the created native component.
 */
export type ControllerDescriptor = {
  controllerId: string;
  requiresUserInteraction: boolean;
};

/**
 * The finite native request categories that can suspend a checkout operation.
 *
 * The payload for each category remains JSON so native SDK/API additions do not require unsafe
 * bridge object casts or an immediate Codegen schema migration.
 */
export type CheckoutEventKind =
  | 'advancedSubmit'
  | 'advancedAdditionalDetails'
  | 'sessionBeforeSubmit'
  | 'applePayAuthorization'
  | 'applePayShippingContact'
  | 'applePayShippingMethod'
  | 'applePayCouponCode'
  | 'addressLookupSearch'
  | 'addressLookupSelection'
  | 'completion'
  | 'error';

/**
 * A checkout event has stable control metadata and an explicit JSON payload boundary.
 *
 * `operationId` is present for operation-scoped events. `requestId` is present only when a
 * JavaScript response is required. Both identities are internal protocol details.
 */
export type CheckoutEvent = {
  checkoutId: string;
  operationId?: string;
  requestId?: string;
  kind: CheckoutEventKind;
  payloadJson?: string;
};

/**
 * The only way to settle an event that created a native request.
 */
export type CheckoutResponse = {
  checkoutId: string;
  operationId: string;
  requestId: string;
  kind: CheckoutEventKind;
  payloadJson?: string;
};

/**
 * Generated native checkout control surface.
 *
 * Setup payloads and evolving Adyen configuration/result data cross explicit JSON boundaries.
 * Checkout, operation, and request identities remain private to the JavaScript facade.
 */
export interface Spec extends TurboModule {
  setSdkVersion(sdkVersion: string): void;
  setupSession(
    sessionJson: string,
    configurationJson: string
  ): Promise<CheckoutDescriptor>;
  setupAdvanced(
    paymentMethodsJson: string,
    configurationJson: string
  ): Promise<CheckoutDescriptor>;
  isAvailable(checkoutId: string, paymentMethodId: string): Promise<boolean>;
  createController(
    checkoutId: string,
    paymentMethodId: string
  ): Promise<ControllerDescriptor>;
  submitController(checkoutId: string, controllerId: string): Promise<void>;
  startDropIn(checkoutId: string): Promise<void>;
  respond(response: CheckoutResponse): Promise<void>;
  invalidate(checkoutId: string): Promise<void>;
  readonly onCheckoutEvent: EventEmitter<CheckoutEvent>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AdyenCheckout');
