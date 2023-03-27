import { Environment, FieldsetVisibility } from "./constants";
import { PaymentAmount } from "./types";

/**
 * General type for AdyenContext configuration. See {@link https://github.com/Adyen/adyen-react-native/blob/develop/docs/Configuration.md}
 */
export interface Configuration {
    /** Selected environment */
    environment: typeof Environment;
  
    /** A public key linked to your web service user, used for {@link https://docs.adyen.com/user-management/client-side-authentication | client-side authentication}. */
    clientKey: string;
  
    /** Return URL to be called after payment is completed. */
    returnUrl: string;
  
    /** The shopper's country code. A valid value is an ISO two-character country code (e.g. 'NL'). */
    countryCode?: string;
  
    /** Amount to be displayed on the Pay Button. */
    amount?: PaymentAmount;
  
    /** Drop-In configuration. */
    dropin?: DropInConfiguration;

    /** Card component configuration. */
    card?: CardsConfiguration;

    /** ApplePay component configuration. */
    applepay?: ApplePayConfiguration;
  }
  
  export interface DropInConfiguration {
    /**  Determines whether to enable preselected stored payment method view step */
    showPreselectedStoredPaymentMethod: boolean;
  
    /** Determines whether to enable skipping payment list step when there is only one non-instant payment method. */
    skipListWhenSinglePaymentMethod: boolean;
  }

  export interface CardsConfiguration {
    /**  Determines whether to enable preselected stored payment method view step */
    holderNameRequired?: boolean;
    addressVisibility?: FieldsetVisibility,
    showStorePaymentField?: false,
    hideCvcStoredCard?: true,
    hideCvc?: true
  }

  export interface ApplePayConfiguration {
    /**  The merchant identifier for apple pay. */
    merchantID: string,
    /** The merchant name.  */
    merchantName: string,
    /** The flag to toggle onboarding. */
    allowOnboarding?: boolean
  }
  