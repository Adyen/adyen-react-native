// @ts-check

import type {
  AddressLookup,
  AddressLookupItem,
  ApplePayRecurringPaymentRequest,
  BinLookupData,
  Configuration,
  StoredPaymentMethod,
} from '@adyen/react-native';
import { ENVIRONMENT } from '../Configuration';
import ApiClient from '../api/APIClient';
import type { PaymentConfiguration } from '../api/types';

export const checkoutConfiguration = (config: PaymentConfiguration) => {
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
      showRemovePaymentMethodButton: true,
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
      addressVisibility: 'lookup',
      allowedAddressCountryCodes: ['US', 'GB', 'CA', 'NL'],
      onUpdateAddress: (_prompt: string, lookup: AddressLookup) => {
        // Make request to Google Maps API or other address provider.
        lookup.update(mockAddresses);
      },
      onConfirmAddress: (address: AddressLookupItem, lookup: AddressLookup) => {
        // Make request to Google Maps API or other address provider.
        lookup.confirm(address);
      },
      onBinValue: (binValue: string) => {
        console.log('BIN: ', binValue);
      },
      onBinLookup: (binData: BinLookupData[]) => {
        console.log('BIN data: ', JSON.stringify(binData));
      },
    },
    applepay: {
      merchantID: ENVIRONMENT.applepayMerchantID,
      merchantName: config.merchantName,
      requiredBillingContactFields: ['phoneticName', 'postalAddress'],
      requiredShippingContactFields: [
        'name',
        'phone',
        'email',
        'postalAddress',
      ],
      recurringPaymentRequest: mockApplePayRecurringPayment,
    },
    googlepay: {
      billingAddressRequired: true,
      billingAddressParameters: {
        format: 'FULL',
        phoneNumberRequired: true,
      },
      shippingAddressRequired: true,
      shippingAddressParameters: {
        allowedCountryCodes: ['US', 'MX'],
        phoneNumberRequired: true,
      },
      emailRequired: true,
    },
  };
  return configuration;
};

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
