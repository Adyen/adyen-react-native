// @ts-check

import React, {
  useContext,
  useState,
  useMemo,
  createContext,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ENVIRONMENT} from '../Configuration';
import ApiClient from './APIClient';

export const AppContext = createContext({
  configuration: {},
  save: async (/** @type {any} */ configuration) => {},
});

export const checkoutConfiguration = (
  /** @type {{ shopperLocale?: any; amount?: any; currency?: any; countryCode?: any; merchantName?: any; }} */ config,
) => {
  const /** @type {import('@adyen/react-native').Configuration} */ configuration =
      {
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
            storedPaymentMethod,
            resolve,
            reject,
          ) => {
            try {
              let success = await ApiClient.removeStoredCard(
                storedPaymentMethod.id,
                config,
              );
              if (success) {
                resolve();
              } else {
                reject();
              }
            } catch (error) {
              reject();
            }
          },
        },
        card: {
          addressVisibility: 'lookup',
          allowedAddressCountryCodes: ['US', 'GB', 'CA', 'NL'],
          onUpdateAddress: (
            /** @type {any} */ prompt,
            /** @type { import('@adyen/react-native').AddressLookup } */ lookup,
          ) => {
            // Make request to Google Maps API or other addres provider.
            lookup.update(mockAddresses);
          },
          onConfirmAddress: (
            /** @type { import('@adyen/react-native').AddressLookupItem } */ address,
            /** @type { import('@adyen/react-native').AddressLookup } */ lookup,
          ) => {
            // Make request to Google Maps API or other addres provider.
            lookup.confirm(address);
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
          recurringPaymentRequest: {
            description: 'My Subscription',
            regularBilling: {
              amount: 1000,
              label: 'Monthy payment',
              intervalCount: 1,
              intervalUnit: 'month',
              startDate: new Date(
                new Date().setDate(new Date().getDate() + 7),
              ).toISOString(),
            },
            managementURL: 'https://my-domain.com/managementURL',
            trialBilling: {
              amount: 10,
              label: 'Trail week',
              intervalCount: 7,
              intervalUnit: 'day',
              endDate: new Date(
                new Date().setDate(new Date().getDate() + 7),
              ).toISOString(),
            },
            tokenNotificationURL: 'https://my-domain.com/tokenNotificationURL',
            billingAgreement: 'Hereby I am willing to give my money',
          },
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

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppContext');
  }
  return context;
};

const storeKey = '@config_storage';

const AppContextProvider = (/** @type {any} */ props) => {
  const [config, setConfig] = useState(props.configuration);

  useEffect(() => {
    AsyncStorage.getItem(storeKey)
      .then(value => {
        if (value) {
          console.debug(`Stored config: ${value}`);
          const parsed = JSON.parse(value);
          setConfig(parsed);
        }
      })
      .catch(props.onError);
  }, []);

  const saveConfiguration = async (newConfig = config) => {
    await AsyncStorage.setItem(storeKey, JSON.stringify(newConfig));

    setConfig(newConfig);
  };

  const appState = useMemo(
    () => ({
      configuration: config,
      save: saveConfiguration,
    }),
    [config],
  );

  return (
    <AppContext.Provider value={appState}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;

const mockAddresses = [
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
