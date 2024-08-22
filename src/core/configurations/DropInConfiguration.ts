
export interface DropInConfiguration {
  /**  Determines whether to enable preselected stored payment method view step */
  showPreselectedStoredPaymentMethod?: boolean;
  /** Determines whether to enable skipping payment list step when there is only one non-instant payment method. */
  skipListWhenSinglePaymentMethod?: boolean;
  /** Set to true to show a button that lets the shopper remove a stored payment methods. */
  showRemovePaymentMethodButton?: boolean;
  /** Set custom title for preselected stored payment method view Drop-in on iOS. By default app's name used. This property have no effect on Android. */
  title?: string;
}
