import { NativeEventEmitter } from 'react-native';
import type { EventSubscription } from 'react-native';
import type { NativeModule } from '../base/EventListenerWrapper';
import {
  Event,
  type AdyenError,
  type ApplePayAuthorizationResult,
  type ApplePayCouponCodeEvent,
  type ApplePayCouponCodeUpdateRequest,
  type ApplePayPaymentAuthorization,
  type ApplePayPaymentContact,
  type ApplePayShippingContactUpdateRequest,
  type ApplePayShippingMethod,
  type ApplePayShippingMethodUpdateRequest,
  type Configuration,
  type EnvironmentConfiguration,
  type PaymentAction,
  type PaymentDetailsData,
  type PaymentMethodsResponse,
  type SessionConfiguration,
  type SessionsResult,
  type SubmitModel,
} from '../../core';
import type { AdyenContextModule } from './ContextModule';
import type { SessionContext } from './types';

/** Native module interface specific to AdyenContext */
interface ContextNativeModule extends NativeModule {
  setup(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration
  ): Promise<void>;
  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext>;
  isAvailable(type: string): Promise<boolean>;
  requiresUserInteraction(type: string): Promise<boolean>;
  submit(type: string): void;
  cleanup(): void;
  action(action: PaymentAction): void;
  completion(resultCode: string): void;
  retry(message?: string): void;
  provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void;
  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void;
  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void;
}

export class ContextModuleWrapper implements AdyenContextModule {
  private readonly nativeModule: ContextNativeModule;
  private readonly eventEmitter: NativeEventEmitter;
  private readonly subscriptions: Map<string, EventSubscription> = new Map();

  constructor(nativeModule: ContextNativeModule) {
    this.nativeModule = nativeModule;
    this.eventEmitter = new NativeEventEmitter(nativeModule);
  }

  setup(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration
  ): Promise<void> {
    return this.nativeModule.setup(paymentMethods, configuration);
  }

  action(action: PaymentAction): void {
    this.nativeModule.action(action);
  }

  completion(resultCode: string): void {
    this.nativeModule.completion(resultCode);
  }

  retry(message?: string): void {
    this.nativeModule.retry(message);
  }

  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext> {
    return this.nativeModule.createSession(session, configuration);
  }

  isAvailable(type: string): Promise<boolean> {
    return this.nativeModule.isAvailable(type);
  }

  requiresUserInteraction(type: string): Promise<boolean> {
    return this.nativeModule.requiresUserInteraction(type);
  }

  submit(type: string): void {
    this.nativeModule.submit(type);
  }

  cleanup(): void {
    this.nativeModule.cleanup();
  }

  /**
   * Register a single listener per event, replacing any previously registered
   * listener for the same event so re-`setup()` calls never accumulate
   * duplicate handlers.
   */
  private subscribe<T>(
    event: Event,
    callback: (data: T) => void
  ): EventSubscription {
    this.subscriptions.get(event)?.remove();
    const subscription = this.eventEmitter.addListener(event, (data) =>
      callback(data)
    );
    this.subscriptions.set(event, subscription);
    return subscription;
  }

  /**
   * Subscribe to session completion events.
   * @param callback - Called when the session completes successfully.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignCompletionHandler(
    callback: (result: SessionsResult) => void
  ): EventSubscription {
    return this.subscribe(Event.onSessionComplete, callback);
  }

  /**
   * Subscribe to session error events.
   * @param callback - Called when the session fails with an error.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignErrorHandler(callback: (error: AdyenError) => void): EventSubscription {
    return this.subscribe(Event.onSessionError, callback);
  }

  /**
   * Subscribe to advanced-flow submit events.
   * @param callback - Called when the shopper submits a payment.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignSubmitHandler(
    callback: (data: SubmitModel) => void
  ): EventSubscription {
    return this.subscribe(Event.onSubmit, callback);
  }

  /**
   * Subscribe to advanced-flow additional-details events.
   * @param callback - Called when a payment requires additional details.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignAdditionalDetailsHandler(
    callback: (data: PaymentDetailsData) => void
  ): EventSubscription {
    return this.subscribe(Event.onAdditionalDetails, callback);
  }

  /**
   * Subscribe to advanced-flow error events.
   * @param callback - Called when the advanced flow fails with an error.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignAdvancedErrorHandler(
    callback: (error: AdyenError) => void
  ): EventSubscription {
    return this.subscribe(Event.onError, callback);
  }

  /**
   * Subscribe to Apple Pay authorization events (iOS only).
   * @param callback - Called with the payment details when authorization occurs.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayAuthorizationHandler(
    callback: (payment: ApplePayPaymentAuthorization) => void
  ): EventSubscription {
    return this.subscribe(Event.onApplePayAuthorization, callback);
  }

  /**
   * Subscribe to Apple Pay shipping-contact change events (iOS only).
   * @param callback - Called with the selected contact.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayShippingContactHandler(
    callback: (contact: ApplePayPaymentContact) => void
  ): EventSubscription {
    return this.subscribe(Event.onApplePayShippingContactChange, callback);
  }

  /**
   * Subscribe to Apple Pay shipping-method change events (iOS only).
   * @param callback - Called with the selected shipping method.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayShippingMethodHandler(
    callback: (shippingMethod: ApplePayShippingMethod) => void
  ): EventSubscription {
    return this.subscribe(Event.onApplePayShippingMethodChange, callback);
  }

  /**
   * Subscribe to Apple Pay coupon-code change events (iOS 15+ only).
   * @param callback - Called with the entered coupon code.
   * @returns EventSubscription that can be used to remove the listener.
   */
  assignApplePayCouponCodeHandler(
    callback: (data: ApplePayCouponCodeEvent) => void
  ): EventSubscription {
    return this.subscribe(Event.onApplePayCouponCodeChange, callback);
  }

  provideAuthorizationResult(result: ApplePayAuthorizationResult): void {
    this.nativeModule.provideAuthorizationResult(result);
  }

  provideShippingContactUpdate(
    update: ApplePayShippingContactUpdateRequest
  ): void {
    this.nativeModule.provideShippingContactUpdate(update);
  }

  provideShippingMethodUpdate(
    update: ApplePayShippingMethodUpdateRequest
  ): void {
    this.nativeModule.provideShippingMethodUpdate(update);
  }

  provideCouponCodeUpdate(update: ApplePayCouponCodeUpdateRequest): void {
    this.nativeModule.provideCouponCodeUpdate(update);
  }

  /**
   * Remove all session event listeners.
   */
  removeAllListeners(): void {
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions.clear();
  }
}
