import { StoredPaymentMethod } from '../types';

export interface DropInConfiguration {
  /**  Determines whether to enable preselected stored payment method view step */
  showPreselectedStoredPaymentMethod?: boolean;
  /** Determines whether to enable skipping payment list step when there is only one non-instant payment method. */
  skipListWhenSinglePaymentMethod?: boolean;
  /** Set to true to show a button that lets the shopper remove a stored payment methods. */
  showRemovePaymentMethodButton?: boolean;
  /** Set custom title for preselected stored payment method view Drop-in on iOS. By default app's name used. This property have no effect on Android. */
  title?: string;
  /**
   * Called when a shopper clicks Remove on a stored payment method
   * Use this to call the {@link https://docs.adyen.com/api-explorer/#/Recurring/v49/post/disable /disable endpoint}
   * Call resolve() if the removal was successful, or call reject() if there was an error
   * @defaultValue false
   */
  onDisableStoredPaymentMethod?(
    storedPaymentMethod: StoredPaymentMethod,
    resolve: () => void,
    reject: () => void
  ): void;
}
