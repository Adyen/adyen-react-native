import { type ConfigPlugin, createRunOncePlugin } from '@expo/config-plugins';
import { withAdyenAndroid } from './withAdyenAndroid';
import { withAdyenIos } from './withAdyenIos';

const pkg = require('@adyen/react-native/package.json');

export type AdyenPluginProps = {
  merchantIdentifier?: string | string[];
  /**
   * Android: R8 version to pin in `android/settings.gradle`. Defaults to the version that
   * works with native 3D Secure 2 in release builds. `false` turns the pin off.
   */
  r8Version?: string | false;
  /**
   * Android: turns off the release build check for R8 versions that break native 3D Secure 2.
   * Set it when you fixed the problem another way (`-dontoptimize` or `adyen-3ds2` 2.2.27).
   */
  skipR8Check?: boolean;
};

const withAdyen: ConfigPlugin<AdyenPluginProps> = (config, props) => {
  config = withAdyenIos(config, props ?? {});
  config = withAdyenAndroid(config, props ?? {});
  return config;
};

export default createRunOncePlugin(withAdyen, pkg.package, pkg.version);
