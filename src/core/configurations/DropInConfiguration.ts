
export interface DropInConfiguration {
  /**  Determines whether to enable preselected stored payment method view step */
  showPreselectedStoredPaymentMethod?: boolean;
  /** Determines whether to enable skipping payment list step when there is only one non-instant payment method. */
  skipListWhenSinglePaymentMethod?: boolean;
  /** Set custom title for preselected stored payment method view Drop-in on iOS. By default app's name used. This property have no effect on Android. */
  title?: string;
}
