import { NativeModules, Platform } from 'react-native';
import { httpPost } from '../Services/https';
import { AnalyticsProps } from './Analytics';
const project = require('./../../../package.json');

type Config = Pick<
  AnalyticsProps,
  'environment' | 'locale' | 'clientKey' | 'amount'
>;

const CHANNEL = Platform.select({
  ios: () => 'iOS',
  android: () => 'Android',
  default: () => 'channel',
})();

const DEVICE_LOCALE = (
  Platform.OS === 'ios'
    ? NativeModules.SettingsManager.settings.AppleLocale ||
      NativeModules.SettingsManager.settings.AppleLanguages[0] //iOS 13
    : NativeModules.I18nManager.localeIdentifier
).replace('_', '-');

/**
 * Log event to Adyen
 * @param config -
 */
const logTelemetry = (config: Config) => (event: any) => {
  if (!config.clientKey) return Promise.reject();

  const options = {
    errorLevel: 'silent' as const,
    environment: config.environment,
    path: `v2/analytics/log?clientKey=${config.clientKey}`,
  };

  const constants = Platform.constants as any;
  const telemetryEvent = {
    amountValue: config.amount?.value,
    amountCurrency: config.amount?.currency,
    version: project.version,
    systemVersion: Platform.Version,
    deviceModel: Platform.select({
      android: `${constants.Manufacturer} ${constants.Model}`,
      ios: constants.interfaceIdiom,
    }),
    channel: CHANNEL,
    platform: 'react-native',
    locale: config.locale ?? DEVICE_LOCALE,
    flavor: 'components',
    userAgent: navigator.userAgent,
    ...event,
  };

  return httpPost(options, telemetryEvent);
};

export default logTelemetry;
