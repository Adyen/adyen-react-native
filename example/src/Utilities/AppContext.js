// @ts-check

import React, {
  useContext,
  useState,
  useMemo,
  createContext,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENVIRONMENT } from '../Configuration';

export const AppContext = createContext({
  configuration: {},
  save: async (configuration) => {},
});

export const checkoutConfiguration = (config) => {
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

const AppContextProvider = (props) => {
  const [config, setConfig] = useState(props.configuration);

  useEffect(() => {
    AsyncStorage.getItem(storeKey)
      .then((value) => {
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
    [config]
  );

  return (
    <AppContext.Provider value={appState}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
