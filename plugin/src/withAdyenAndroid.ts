import {
  ConfigPlugin,
  withMainActivity,
  withAndroidStyles,
} from '@expo/config-plugins';
import { setAppTheme } from './setAppTheme';
import { setKotlinMainActivity } from './setKotlinMainActivity';
import { setJavaMainActivity } from './setJavaMainActivity';

export const withAdyenAndroid: ConfigPlugin = (config) => {
  config = withMainActivity(config, async (newConfig) => {
    const mainActivity = newConfig.modResults;
    if (mainActivity.contents.includes('AdyenCheckout')) {
      return newConfig;
    }
    if (mainActivity.language == 'java') {
      mainActivity.contents = setJavaMainActivity(
        mainActivity.contents
      );
    } else {
      mainActivity.contents = setKotlinMainActivity(
        mainActivity.contents
      );
    }

    return newConfig;
  });

  config = withAndroidStyles(config, async (newConfig) => {
    newConfig.modResults = setAppTheme(newConfig.modResults);
    return newConfig;
  });

  return config;
};


