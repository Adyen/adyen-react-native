/**
 * @format
 */

import React, { useMemo } from 'react';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { ExternalConfigProvider } from './src/config/ExternalConfigProvider';
import { DEFAULT_CONFIGURATION, ENVIRONMENT } from './src/Configuration';
import NetlifyApiClient from './src/api/NetlifyApiClient';
import { netlifyClientKey } from './secrets.json';
import { name as appName } from './app.json';

ENVIRONMENT.clientKey = netlifyClientKey;

const NETLIFY_CONFIGURATION = {
  ...DEFAULT_CONFIGURATION,
  cardSettings: { addressVisibility: 'none' },
};

const NetlifyApp = (props) => {
  const externalProvider = useMemo(
    () =>
      new ExternalConfigProvider(NETLIFY_CONFIGURATION, props.externalConfig),
    [props.externalConfig]
  );

  return (
    <App
      {...props}
      configProvider={externalProvider}
      apiClient={NetlifyApiClient}
    />
  );
};

AppRegistry.registerComponent(appName, () => NetlifyApp);
