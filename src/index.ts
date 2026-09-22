import { configureSDKVersion } from './modules/base/configureSDKVersion';

const sdkVersion = require('../package.json').version as string;

configureSDKVersion(sdkVersion);

export * from './checkout';
export * from './components';
export * from './core';
export * from './modules';
