import type { PaymentConfiguration } from '../api/types';

export type CardSettings = {
  holderNameRequired?: boolean;
  addressVisibility?: 'full' | 'postalCode' | 'none' | 'lookup';
  showStorePaymentField?: boolean;
  hideCvcStoredCard?: boolean;
  hideCvc?: boolean;
  kcpVisibility?: 'show' | 'hide';
  socialSecurity?: 'show' | 'hide';
  enableInstallments?: boolean;
  showInstallmentAmount?: boolean;
};

export type DropInSettings = {
  showPreselectedStoredPaymentMethod?: boolean;
  skipListWhenSinglePaymentMethod?: boolean;
  showRemovePaymentMethodButton?: boolean;
  title?: string;
};

export type ApplePaySettings = {
  merchantID?: string;
  merchantName?: string;
  allowOnboarding?: boolean;
  shippingType?: 'shipping' | 'delivery' | 'storePickup' | 'servicePickup';
  merchantCapabilities?: ('debit' | 'credit')[];
};

export type GooglePaySettings = {
  allowPrepaidCards?: boolean;
  allowCreditCards?: boolean;
  billingAddressRequired?: boolean;
  emailRequired?: boolean;
  shippingAddressRequired?: boolean;
  existingPaymentMethodRequired?: boolean;
  totalPriceStatus?: 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL';
};

export type AppConfiguration = PaymentConfiguration & {
  cardSettings?: CardSettings;
  dropInSettings?: DropInSettings;
  applePaySettings?: ApplePaySettings;
  googlePaySettings?: GooglePaySettings;
};
