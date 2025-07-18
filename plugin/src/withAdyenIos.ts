import {
  ConfigPlugin,
  withAppDelegate,
  withEntitlementsPlist,
} from '@expo/config-plugins';
import { setEntitlements } from './setEntitlements';
import { AdyenPluginProps } from './withAdyen';
import { setImport } from './setImport';
import { setApplicationOpenUrl } from './setApplicationOpenUrl';
import { setApplicationContinueUserActivity } from './setApplicationContinueUserActivity';
import { setImportSwift } from './setImportSwift';
import { setApplicationOpenUrlSwift } from './setApplicationOpenUrlSwift';
import { setApplicationContinueUserActivitySwift } from './setApplicationContinueUserActivitySwift';

export const withAdyenIos: ConfigPlugin<AdyenPluginProps> = (
  config,
  { merchantIdentifier, useFrameworks }
) => {
  config = withAppDelegate(config, (newConfig) => {
    var appDelegate = newConfig.modResults.contents;
    if (
      appDelegate.includes('ADYRedirectComponent') ||
      appDelegate.includes('import Adyen')
    ) {
      return newConfig;
    }
    // Detect if it's Swift or Objective-C
    const isSwift =
      appDelegate.includes('import Expo') ||
      appDelegate.includes('import UIKit');

    if (isSwift) {
      appDelegate = setImportSwift(appDelegate);
      appDelegate = setApplicationOpenUrlSwift(appDelegate);
      appDelegate = setApplicationContinueUserActivitySwift(appDelegate);
    } else {
      appDelegate = setImport(appDelegate, useFrameworks);
      appDelegate = setApplicationOpenUrl(appDelegate);
      appDelegate = setApplicationContinueUserActivity(appDelegate);
    }

    newConfig.modResults.contents = appDelegate;
    return newConfig;
  });

if (merchantIdentifier) {
    config = withEntitlementsPlist(config, (newConfig) => {
      const entitlements = newConfig.modResults;
      newConfig.modResults = setEntitlements(entitlements, merchantIdentifier);
      return newConfig;
    });
  }
  return config;
};
