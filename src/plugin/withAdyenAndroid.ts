import {
  type ConfigPlugin,
  WarningAggregator,
  withGradleProperties,
  withMainActivity,
  withAndroidStyles,
  withProjectBuildGradle,
  withSettingsGradle,
} from '@expo/config-plugins';
import { setAppTheme } from './setAppTheme';
import { setKotlinGradlePlugin } from './setKotlinGradlePlugin';
import { setKotlinMainActivity } from './setKotlinMainActivity';
import { setJavaMainActivity } from './setJavaMainActivity';
import { DEFAULT_R8_VERSION, assertValidR8Version, setR8Pin } from './setR8Pin';
import { setGradleProperty } from './setGradleProperty';
import type { AdyenPluginProps } from './withAdyen';

export const withAdyenAndroid: ConfigPlugin<AdyenPluginProps> = (
  config,
  props
) => {
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

  const r8Version = props?.r8Version ?? DEFAULT_R8_VERSION;
  if (r8Version !== false) {
    assertValidR8Version(r8Version);
    config = withSettingsGradle(config, (newConfig) => {
      if (newConfig.modResults.language !== 'groovy') {
        WarningAggregator.addWarningAndroid(
          '@adyen/react-native',
          `Could not pin R8 ${r8Version}: only a Groovy settings.gradle is supported. Pin R8 yourself, see docs/Compatibility.md.`
        );
        return newConfig;
      }
      const contents = setR8Pin(newConfig.modResults.contents, r8Version);
      if (!contents.includes('com.android.tools:r8:')) {
        WarningAggregator.addWarningAndroid(
          '@adyen/react-native',
          `Could not pin R8 ${r8Version} in settings.gradle. Pin R8 yourself, see docs/Compatibility.md.`
        );
      }
      newConfig.modResults.contents = contents;
      return newConfig;
    });
  }

  if (props?.skipR8Check) {
    config = withGradleProperties(config, (newConfig) => {
      newConfig.modResults = setGradleProperty(
        newConfig.modResults,
        'adyen.skipR8Check',
        'true'
      );
      return newConfig;
    });
  }

  return config;
};
