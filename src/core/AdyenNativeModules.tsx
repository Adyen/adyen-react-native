import { PaymentAction, PaymentMethodsResponse } from './types';

/**
 * Options for dismissing the payment component.
 */
export interface HideOption {
  /** Alert message after dismiss. Used for Android DropIn and Components only */
  message?: string;
}

/**
 * Universal interface for an Adyen Native payment component.
 */
export interface AdyenComponent {
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

  /**
   * Dismiss the component from the screen.
   * @param success - Indicates whether the component was dismissed successfully.
   * @param option - Additional options for dismissing the component (optional).
   */
  hide: (success: boolean, option?: HideOption) => void;
}
/**
 * Describes an Adyen Component capable of handling payment actions.
 */

export interface AdyenActionComponent extends AdyenComponent {
  /**
   * Handle a payment action received by the component.
   * @param action - The payment action to be handled.
   */
  handle: (action: PaymentAction) => void;
}
