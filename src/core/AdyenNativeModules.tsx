import type { Configuration } from './configurations/Configuration';
import type {
  PaymentAction,
  PaymentMethod,
  PaymentMethodsResponse,
} from './types';

/**
 * Options for dismissing the payment component.
 */
export interface HideOption {
  /** Alert message after dismiss. Used for Android DropIn and Components only */
  message?: string;
}

/**
 * Universal interface for an Adyen Native module.
 */
export interface AdyenComponent {
  /**
   * Dismiss the component from the screen.
   * @param success - Indicates whether the component was dismissed successfully.
   * @param option - Additional options for dismissing the component (optional).
   */
  hide: (success: boolean, option?: HideOption) => void;
}

/**
 * Universal interface for an Adyen Native payment component.
 */
export interface AdyenPaymentComponent extends AdyenComponent {
  /**
   * List of events supported by component
   */
  events: string[];

  /**
   * Show the component above the current screen.
   * @param paymentMethods - The available payment methods.
   * @param configuration - The configuration for the component.
   */
  open: (paymentMethods: PaymentMethodsResponse, configuration: any) => void;
}

/**
 * Describes an Adyen Component capable of handling payment actions.
 */
export interface AdyenActionComponent extends AdyenPaymentComponent {
  /**
   * Handle a payment action received by the component.
   * @param action - The payment action to be handled.
   */
  handle: (action: PaymentAction) => void;
}

/**
 * Describes an Adyen Component capable of handling payment action if specific conditions are met.
 */
export interface ConditionalPaymentComponent extends AdyenComponent {
  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean>;
}
