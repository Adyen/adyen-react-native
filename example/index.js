/**
 * @format
 */

import React from 'react';
import { AppRegistry } from 'react-native';
import App from './src/App';
import { AsyncStorageConfigProvider } from './src/config/AsyncStorageConfigProvider';
import { DEFAULT_CONFIGURATION } from './src/Configuration';
import { name as appName } from './app.json';

const localProvider = new AsyncStorageConfigProvider(DEFAULT_CONFIGURATION);

const DefaultApp = (props) => <App {...props} configProvider={localProvider} />;

AppRegistry.registerComponent(appName, () => DefaultApp);
