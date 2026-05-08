import type {
  AddressLookup,
  AddressLookupItem,
  ApplePayAuthorizationResultRequest,
  ApplePayCouponCodeUpdateRequest,
  ApplePayPaymentAuthorization,
  ApplePayPaymentContact,
  ApplePayRecurringPaymentRequest,
  ApplePayShippingContactUpdateRequest,
  ApplePayShippingMethod,
  ApplePayShippingMethodUpdateRequest,
  BinLookupData,
  Configuration,
  StoredPaymentMethod,
} from '@adyen/react-native';
import { ENVIRONMENT } from '../Configuration';
import ApiClient from '../api/APIClient';
import type { AppConfiguration } from './types';

export const checkoutConfiguration = (config: AppConfiguration) => {
  const configuration: Configuration = {
    clientKey: ENVIRONMENT.clientKey,
    environment: ENVIRONMENT.environment,
    returnUrl: ENVIRONMENT.returnUrl,
    locale: config.shopperLocale,
    amount: {
      value: config.amount,
      currency: config.currency,
    },
    countryCode: config.countryCode,
    analytics: {
      enabled: true,
      verboseLogs: true,
    },
    dropin: {
      showPreselectedStoredPaymentMethod:
        config.dropInSettings?.showPreselectedStoredPaymentMethod,
      skipListWhenSinglePaymentMethod:
        config.dropInSettings?.skipListWhenSinglePaymentMethod,
      showRemovePaymentMethodButton:
        config.dropInSettings?.showRemovePaymentMethodButton ?? true,
      title: config.dropInSettings?.title,
      onDisableStoredPaymentMethod: async (
        storedPaymentMethod: StoredPaymentMethod,
        resolve: () => void,
        reject: () => void
      ) => {
        const success = await ApiClient.tryRemoveStoredCard(
          storedPaymentMethod.id,
          config
        );
        if (success) {
          resolve();
        } else {
          reject();
        }
      },
    },
    card: {
      holderNameRequired: config.cardSettings?.holderNameRequired,
      addressVisibility: config.cardSettings?.addressVisibility ?? 'lookup',
      showStorePaymentField: config.cardSettings?.showStorePaymentField,
      hideCvcStoredCard: config.cardSettings?.hideCvcStoredCard,
      hideCvc: config.cardSettings?.hideCvc,
      kcpVisibility: config.cardSettings?.kcpVisibility,
      socialSecurity: config.cardSettings?.socialSecurity,
      allowedAddressCountryCodes: ['US', 'GB', 'CA', 'NL'],
      onUpdateAddress: (_prompt: string, lookup: AddressLookup) => {
        lookup.update(mockAddresses);
      },
      onConfirmAddress: (address: AddressLookupItem, lookup: AddressLookup) => {
        lookup.confirm(address);
      },
      onBinValue: (binValue: string) => {
        console.debug('BIN: ', binValue);
      },
      onBinLookup: (binData: BinLookupData[]) => {
        console.debug('BIN data: ', JSON.stringify(binData));
      },
      installmentOptions: config.cardSettings?.enableInstallments
        ? {
            card: {
              values: [2, 3, 6],
              plans: ['regular'],
            },
            visa: {
              values: [1, 2, 3, 4, 5, 12],
              plans: ['regular', 'revolving'],
            },
            mc: {
              values: [1, 2, 3, 4, 5, 12],
              plans: ['regular', 'revolving'],
            },
          }
        : undefined,
      showInstallmentAmount: config.cardSettings?.showInstallmentAmount,
    },
    applepay: {
      merchantID:
        config.applePaySettings?.merchantID ?? ENVIRONMENT.applepayMerchantID,
      allowOnboarding: config.applePaySettings?.allowOnboarding,
      summaryItems: [
        {
          label: config.applePaySettings?.merchantName ?? 'Test Merchant',
          amount: config.amount / 100,
        },
      ],
      shippingType: config.applePaySettings?.shippingType,
      supportsCouponCode: true,
      requiredBillingContactFields: ['phoneticName', 'postalAddress'],
      requiredShippingContactFields: [
        'name',
        'phone',
        'email',
        'postalAddress',
      ],
      recurringPaymentRequest: mockApplePayRecurringPayment,
      onShippingContactChange: (
        contact: ApplePayPaymentContact,
        resolve: (update: ApplePayShippingContactUpdateRequest) => void
      ) => {
        console.debug('Apple Pay shipping contact changed:', contact);
        // Update shipping methods and summary items based on the new contact.
        // Call resolve() with no arguments to keep the current values unchanged.
        resolve({
          shippingMethods: mockShippingMethods,
          paymentSummaryItems: [
            { label: 'Shipping', amount: 5 },
            { label: 'Total', amount: config.amount / 100 + 5 },
          ],
        });
      },
      onShippingMethodChange: (
        shippingMethod: ApplePayShippingMethod,
        resolve: (update: ApplePayShippingMethodUpdateRequest) => void
      ) => {
        console.debug('Apple Pay shipping method changed:', shippingMethod);
        const shippingCost = shippingMethod.identifier === 'express' ? 15 : 5;
        resolve({
          paymentSummaryItems: [
            { label: shippingMethod.label, amount: shippingCost },
            { label: 'Total', amount: config.amount / 100 + shippingCost },
          ],
        });
      },
      onCouponCodeChange: (
        couponCode: string,
        resolve: (update: ApplePayCouponCodeUpdateRequest) => void
      ) => {
        console.debug('Apple Pay coupon code entered:', couponCode);
        if (couponCode === 'INVALID') {
          resolve({
            errors: [
              { type: 'couponCode', message: 'This coupon code is not valid.' },
            ],
          });
        } else {
          resolve({});
        }
      },
      onAuthorize: (
        payment: ApplePayPaymentAuthorization,
        resolve: (result: ApplePayAuthorizationResultRequest) => void
      ) => {
        console.debug('Apple Pay payment authorized:', payment);
        // Validate billing/shipping address before submission.
        // Call resolve({ status: 'failure', errors: [...] }) to show errors.
        resolve({ status: 'success' });
      },
    },
    googlepay: {
      allowPrepaidCards: config.googlePaySettings?.allowPrepaidCards,
      allowCreditCards: config.googlePaySettings?.allowCreditCards,
      billingAddressRequired:
        config.googlePaySettings?.billingAddressRequired ?? true,
      billingAddressParameters: {
        format: 'FULL',
        phoneNumberRequired: true,
      },
      shippingAddressRequired:
        config.googlePaySettings?.shippingAddressRequired ?? true,
      shippingAddressParameters: {
        allowedCountryCodes: ['US', 'MX'],
        phoneNumberRequired: true,
      },
      emailRequired: config.googlePaySettings?.emailRequired ?? true,
      existingPaymentMethodRequired:
        config.googlePaySettings?.existingPaymentMethodRequired,
      totalPriceStatus: config.googlePaySettings?.totalPriceStatus,
    },
  };
  return configuration;
};

const mockShippingMethods: ApplePayShippingMethod[] = [
  {
    label: 'Standard Shipping',
    amount: 5,
    identifier: 'standard',
    detail: '5–7 business days',
  },
  {
    label: 'Express Shipping',
    amount: 15,
    identifier: 'express',
    detail: '1–2 business days',
  },
];

const mockAddresses: AddressLookupItem[] = [
  {
    address: {
      houseNumberOrName: '5478',
      street: 'Hessel Bridge',
      stateOrProvince: 'IA',
      country: 'US',
      city: 'Emardfort',
      postalCode: '08272',
    },
    id: 'item1',
  },
  {
    address: {
      houseNumberOrName: 'Apt. 611 425',
      street: 'Myron Inlet',
      stateOrProvince: 'CT',
      country: 'US',
      city: 'Daughertyberg',
      postalCode: '93289-3423',
    },
    id: 'item2',
  },
  {
    address: {
      houseNumberOrName: '616',
      street: 'Pfeffer Ferry',
      stateOrProvince: 'MI',
      country: 'US',
      city: 'Cristiside',
      postalCode: '60347',
    },
    id: 'item3',
  },
];

const mockApplePayRecurringPayment: ApplePayRecurringPaymentRequest = {
  description: 'My Subscription',
  regularBilling: {
    amount: 1000,
    label: 'Monthy payment',
    intervalCount: 1,
    intervalUnit: 'month',
    startDate: new Date(
      new Date().setDate(new Date().getDate() + 7)
    ).toISOString(),
  },
  managementURL: 'https://my-domain.com/managementURL',
  trialBilling: {
    amount: 10,
    label: 'Trail week',
    intervalCount: 7,
    intervalUnit: 'day',
    endDate: new Date(
      new Date().setDate(new Date().getDate() + 7)
    ).toISOString(),
  },
  tokenNotificationURL: 'https://my-domain.com/tokenNotificationURL',
  billingAgreement: 'Hereby I am willing to give my money',
};
