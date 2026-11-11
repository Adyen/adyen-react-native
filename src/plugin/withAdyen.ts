import { type ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins';
import { withAdyenAndroid } from './withAdyenAndroid';
import { withAdyenIos } from './withAdyenIos';

const pkg = require('@adyen/react-native/package.json');

export type AdyenPluginProps = {
  merchantIdentifier?: string | string[];
};

const withAdyen: ConfigPlugin<AdyenPluginProps> = (config, props) => {
  config = withAdyenIos(config, props ?? {});
  config = withAdyenAndroid(config);
  return config;
};

export default createRunOncePlugin(withAdyen, pkg.package, pkg.version);
