import { type ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins';
import { withAdyenAndroid } from './withAdyenAndroid';
import { withAdyenIos } from './withAdyenIos';

const pkg = require('@adyen/react-native/package.json');

export type AdyenPluginProps = {
  merchantIdentifier?: string | string[];
  /**
   * @deprecated No longer needed: the generated Objective-C import works with and without
   * `use_frameworks!`. The value is ignored and will be removed in a future major version.
   */
  useFrameworks?: boolean;
};

const withAdyen: ConfigPlugin<AdyenPluginProps> = (config, props) => {
  config = withAdyenIos(config, props ?? {});
  config = withAdyenAndroid(config);
  return config;
};

export default createRunOncePlugin(withAdyen, pkg.package, pkg.version);
