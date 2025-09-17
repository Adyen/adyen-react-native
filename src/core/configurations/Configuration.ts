import type { PaymentAmount } from '../types';
import type { ApplePayConfiguration } from './ApplePayConfiguration';
import type { CardsConfiguration } from './CardsConfiguration';
import type { DropInConfiguration } from './DropInConfiguration';
import type { GooglePayConfiguration } from './GooglePayConfiguration';
import type { PartialPaymentConfiguration } from './PartialPaymentConfiguration';
import type { ThreeDSConfiguration } from './ThreeDSConfiguration';

/** Collection of available environments. */
export type Environment =
  | 'test'
  | 'live-eu'
  | 'live-us'
  | 'live-au'
  | 'live-apse'
  | 'live-in';

/** Environment configuration */
export interface EnvironmentConfiguration {
  /** Selected environment */
  environment: Environment;
  /** A public key linked to your web service user, used for {@link https://docs.adyen.com/user-management/client-side-authentication | client-side authentication}. */
  clientKey: string;
}

/** Base component configuration */
export interface BaseConfiguration extends EnvironmentConfiguration {
  /** Configuration for analytics service */
  analytics?: AnalyticsOptions;
  /**
   * The shopper's locale. This is used to enforce the language rendered in the UI.
   * If no value is set, will rely on the system to choose the best fitting locale based on the device's locale and locales supported by the app.
   * Fallback locale is 'en-US'.
   * @defaultValue null.
   */
  locale?: string;
}

/** Analytics configuration */
export interface AnalyticsOptions {
  /** Enable/Disable all telemetry. */
  enabled?: boolean;
  /** Enable/Disable verbose logs printed in the IDE developer console. */
  verboseLogs?: boolean;
}

/**
 * General type for AdyenContext configuration. See {@link https://github.com/Adyen/adyen-react-native/blob/develop/docs/Configuration.md}
 */
export interface Configuration extends BaseConfiguration {
  /** Return URL to be called after payment is completed. This value is always passed throught on iOS and in some cases overrided on Android. */
  returnUrl: string;
  /** The shopper's country code. A valid value is an ISO two-character country code (e.g. 'NL'). Required for iOS to visualize the amount. */
  countryCode?: string;
  /** Amount to be displayed on the Pay Button. */
  amount?: PaymentAmount;
  /** Drop-In configuration. */
  dropin?: DropInConfiguration;
  /** Card component configuration. */
  card?: CardsConfiguration;
  /** Apple Pay component configuration. */
  applepay?: ApplePayConfiguration;
  /** Google Pay component configuration. */
  googlepay?: GooglePayConfiguration;
  /** 3D Secure 2 authentication configuration. */
  threeDS2?: ThreeDSConfiguration;
  /** Partial payment flow configuration. */
  partialPayment?: PartialPaymentConfiguration;
}
