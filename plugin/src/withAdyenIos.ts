import {
  ConfigPlugin,
  withAppDelegate,
  withEntitlementsPlist,
} from '@expo/config-plugins';
import { setApplePayEntitlement } from './setApplePayEntitlement';
import { AdyenPluginProps } from './withAdyen';
import { setImport } from './setImport';
import { setApplicationOpenUrl } from './setApplicationOpenUrl';
import { setApplicationContinueUserActivity } from './setApplicationContinueUserActivity';

export const withAdyenIos: ConfigPlugin<AdyenPluginProps> = (
  config,
  { merchantIdentifier, useFrameworks }
) => {
  config = withAppDelegate(config, async (newConfig) => {
    var appDelegate = newConfig.modResults.contents;
    if (appDelegate.includes('ADYRedirectComponent')) {
      return newConfig;
    }
    appDelegate = setImport(appDelegate, useFrameworks);
    appDelegate = setApplicationOpenUrl(appDelegate);
    appDelegate = setApplicationContinueUserActivity(appDelegate);
    newConfig.modResults.contents = appDelegate;
    return newConfig;
  });

  if (merchantIdentifier) {
    config = withEntitlementsPlist(config, (newConfig) => {
      const entitlements = newConfig.modResults;
      newConfig.modResults = setApplePayEntitlement(
        entitlements,
        merchantIdentifier
      );
      return newConfig;
    });
  }
  return config;
};
