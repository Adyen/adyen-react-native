import {
  ConfigPlugin,
  withAppDelegate,
  withEntitlementsPlist,
} from '@expo/config-plugins';
import {setApplePayEntitlement} from './setApplePayEntitlement';
import {AdyenPluginProps} from './withAdyen';
import {setImport} from './setImport';
import {setRedirectComponent} from './setRedirectComponent';

export const withAdyenIos: ConfigPlugin<AdyenPluginProps> = (
  config,
  {merchantIdentifier, useFrameworks},
) => {
  config = withAppDelegate(config, async (newConfig) => {
    const appDelegate = newConfig.modResults.contents;
    if (appDelegate.includes("ADYRedirectComponent")) {
      return newConfig
    }
    newConfig.modResults.contents = setImport(appDelegate, useFrameworks);
    newConfig.modResults.contents = setRedirectComponent(appDelegate);
    return newConfig;
  });

  if (merchantIdentifier) {
    config = withEntitlementsPlist(config, (newConfig) => {
      const entitlements = newConfig.modResults;
      newConfig.modResults = setApplePayEntitlement(
        entitlements,
        merchantIdentifier,
      );
      return newConfig;
    });
  }
  return config;
};
