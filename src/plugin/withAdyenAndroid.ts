import {
  type ConfigPlugin,
  withMainActivity,
  withAndroidStyles,
  withProjectBuildGradle,
} from '@expo/config-plugins';
import { setAppTheme } from './setAppTheme';
import { setKotlinGradlePlugin } from './setKotlinGradlePlugin';
import { setKotlinMainActivity } from './setKotlinMainActivity';
import { setJavaMainActivity } from './setJavaMainActivity';

export const withAdyenAndroid: ConfigPlugin = (config) => {
  config = withMainActivity(config, async (newConfig) => {
    const mainActivity = newConfig.modResults;
    if (mainActivity.contents.includes('AdyenCheckout')) {
      return newConfig;
    }
    if (mainActivity.language === 'java') {
      mainActivity.contents = setJavaMainActivity(mainActivity.contents);
    } else {
      const sdkVersion = config.sdkVersion ?? '49.0.0';
      const version = Number.parseInt(sdkVersion.split('.')[0] ?? '49', 10);
      mainActivity.contents = setKotlinMainActivity(
        mainActivity.contents,
        version
      );
    }

    return newConfig;
  });

  config = withAndroidStyles(config, async (newConfig) => {
    newConfig.modResults = setAppTheme(newConfig.modResults);
    return newConfig;
  });

  config = withProjectBuildGradle(config, async (newConfig) => {
    if (newConfig.modResults.language === 'groovy') {
      newConfig.modResults.contents = setKotlinGradlePlugin(
        newConfig.modResults.contents
      );
    }
    return newConfig;
  });

  return config;
};
