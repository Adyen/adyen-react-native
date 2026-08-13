import { NativeModules, type EventSubscription } from 'react-native';
import type {
  PaymentSubmitResultHandler,
  PaymentResult,
  AdyenError,
  ApplePayAuthorizationResult,
  ApplePayCouponCodeEvent,
  ApplePayCouponCodeUpdateRequest,
  ApplePayPaymentAuthorization,
  ApplePayPaymentContact,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethod,
  ApplePayShippingMethodUpdateRequest,
  Configuration,
  EnvironmentConfiguration,
  PaymentDetailsData,
  PaymentMethodsResponse,
  SessionConfiguration,
  SessionsResult,
  SubmitModel,
} from '../../core';
import { ModuleMock } from '../base/ModuleMock';
import { ContextModuleWrapper } from './ContextModuleWrapper';
import type { SessionContext } from './types';

/** Describes a native module capable of setting up the checkout and creating sessions. */
export interface AdyenContextModule extends PaymentSubmitResultHandler {
  /**
   * Sets up the checkout with payment methods and configuration.
   * @param paymentMethods - The payment methods response from the Adyen API.
   * @param configuration - The checkout configuration.
   */
  setup(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration
  ): Promise<void>;

  /**
   * Initiates session on client side and provides session context for sessionData and SessionID.
   * @param session - Session configuration (id and SessionData)
   * @param configuration - Environment configuration
   */
  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext>;

  /**
   * Checks whether a payment method type is available for the shopper.
   *
   * Google Pay runs a device availability check on Android (unavailable on iOS);
   * Apple Pay runs a PassKit availability check on iOS (unavailable on Android);
   * any other type resolves to whether it exists in the configured payment methods.
   * @param type - The payment method type (e.g. "scheme", "googlepay", "applepay").
   */
  isAvailable(type: string): Promise<boolean>;

  /**
   * Pre-builds the controller for the given payment method type and reports whether it
   * needs to display UI before it can be submitted.
   * @param type - The payment method type.
   */
  requiresUserInteraction(type: string): Promise<boolean>;

  /**
   * Submits the given payment method type without displaying UI (headless flow).
   * @param type - The payment method type.
   */
  submit(type: string): void;

  /**
   * Tears down the checkout context, disposing all pre-built controllers.
   */
  cleanup(): void;

  /**
   * Subscribe to session completion events.
   * @param callback - Called when the session completes successfully.
   * @returns EmitterSubscription that can be used to remove the listener.
   */
  assignCompletionHandler(
    callback: (result: SessionsResult) => void
  ): EventSubscription;

  /**
   * Subscribe to session error events.
   * @param callback - Called when the session fails with an error.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignErrorHandler(callback: (error: AdyenError) => void): EventSubscription;

  /**
   * Subscribe to advanced-flow submit events.
   * @param callback - Called when the shopper submits a payment.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignSubmitHandler(callback: (data: SubmitModel) => void): EventSubscription;

  /**
   * Subscribe to advanced-flow additional-details events.
   * @param callback - Called when a payment requires additional details.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignAdditionalDetailsHandler(
    callback: (data: PaymentDetailsData) => void
  ): EventSubscription;

  /**
   * Subscribe to advanced-flow completion events.
   * @param callback - Called when the advanced flow completes successfully.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignAdvancedCompleteHandler(
    callback: (result: PaymentResult) => void
  ): EventSubscription;

  /**
   * Subscribe to advanced-flow error events.
   * @param callback - Called when the advanced flow fails with an error.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignAdvancedErrorHandler(
    callback: (error: AdyenError) => void
  ): EventSubscription;

  /**
   * Subscribe to Apple Pay authorization events (iOS only). The shopper has authorized the
   * payment in the Apple Pay sheet; respond with {@link provideAuthorizationResult}.
   * @param callback - Called with the payment details when authorization occurs.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayAuthorizationHandler(
    callback: (payment: ApplePayPaymentAuthorization) => void
  ): EventSubscription;

  /**
   * Subscribe to Apple Pay shipping-contact change events (iOS only). Respond with
   * {@link provideShippingContactUpdate}.
   * @param callback - Called with the selected contact.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayShippingContactHandler(
    callback: (contact: ApplePayPaymentContact) => void
  ): EventSubscription;

  /**
   * Subscribe to Apple Pay shipping-method change events (iOS only). Respond with
   * {@link provideShippingMethodUpdate}.
   * @param callback - Called with the selected shipping method.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayShippingMethodHandler(
    callback: (shippingMethod: ApplePayShippingMethod) => void
  ): EventSubscription;

  /**
   * Subscribe to Apple Pay coupon-code change events (iOS 15+ only). Respond with
   * {@link provideCouponCodeUpdate}.
   * @param callback - Called with the entered coupon code.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayCouponCodeHandler(
    callback: (data: ApplePayCouponCodeEvent) => void
  ): EventSubscription;

  /**
   * Resume a suspended Apple Pay authorization with the shopper's result (iOS only).
   * @param result - Whether to approve the payment or reject it with field errors.
   */
  provideAuthorizationResult(result: ApplePayAuthorizationResult): void;

  /**
   * Resume a suspended Apple Pay shipping-contact callback with updated sheet data (iOS only).
   * @param update - Updated summary items, shipping methods and/or errors.
   */
  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void;

  /**
   * Resume a suspended Apple Pay shipping-method callback with updated sheet data (iOS only).
   * @param update - Updated summary items.
   */
  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void;

  /**
   * Resume a suspended Apple Pay coupon-code callback with updated sheet data (iOS 15+ only).
   * @param update - Updated summary items, shipping methods and/or errors.
   */
  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void;

  /**
   * Remove all session event listeners.
   */
  removeAllListeners(): void;
}

/** Collection of setup and session helper methods */
export const AdyenContext: AdyenContextModule = new ContextModuleWrapper(
  NativeModules.AdyenContext ?? ModuleMock
);
