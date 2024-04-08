import {
  ConfigPlugin,
  withAppDelegate,
  withEntitlementsPlist,
} from '@expo/config-plugins';
import { setApplePayEntitlement } from './setApplePayEntitlement';
import { AdyenPluginProps } from './withAdyen';
import { setImport } from './setImport';
import { setRedirectComponent } from './setRedirectComponent';

export const withAdyenIos: ConfigPlugin<AdyenPluginProps> = (
  config,
  { merchantIdentifier, useFrameworks }
) => {
  const configWithAppDelegate = withAppDelegate(config, async (newConfig) => {
    const appDelegateModResults = newConfig.modResults;
    appDelegateModResults.contents = setImport(
      appDelegateModResults.contents,
      useFrameworks
    );
    appDelegateModResults.contents = setRedirectComponent(
      appDelegateModResults.contents
    );
    return newConfig;
  });
  // apply Apple Pay Merchant ID
  if (merchantIdentifier) {
    const configWithEntitlments = withEntitlementsPlist(
      configWithAppDelegate,
      (newConfig) => {
        newConfig.modResults = setApplePayEntitlement(
          merchantIdentifier,
          newConfig.modResults
        );
        return newConfig;
      }
    );
    return configWithEntitlments;
  }
  return configWithAppDelegate;
};


