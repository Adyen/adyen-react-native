const {
  withAndroidManifest,
  withMainActivity,
  withAppDelegate,
  withDangerousMod,
} = require('@expo/config-plugins');
const { resolve } = require('path');
const { readFileSync, writeFileSync } = require('fs');
const {
  mergeContents,
} = require('@expo/config-plugins/build/utils/generateCode');

const withPodsPreprocessingFix = (defaultConfig) => {
  return withDangerousMod(defaultConfig, [
    'ios',
    (config) => {
      // Gets project root file from mod request
      const { platformProjectRoot } = config.modRequest;
      // Gets podfile from project
      const podfile = resolve(platformProjectRoot, 'Podfile');
      // Opens content of podfile in utf encoding
      const contents = readFileSync(podfile, 'utf-8');

      // Adds required Pod into Podfile
      const addPreprocessing = mergeContents({
        tag: 'Add preprocessing fix',
        src: contents,
        newSrc: `\n    installer.pods_project.targets.each do |target|
        target.build_configurations.each do |config|
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)', '_LIBCPP_ENABLE_CXX17_REMOVED_UNARY_BINARY_FUNCTION']
        end
      end`,
        anchor: /apply_Xcode_12_5_M1_post_install_workaround/,
        offset: 0,
        comment: '#',
      });

      if (!addPreprocessing.didMerge) {
        console.log(
          "ERROR: Cannot add block to the project's ios/Podfile because it's malformed. Please report this with a copy of your project Podfile."
        );
        return defaultConfig;
      }
      writeFileSync(podfile, addPreprocessing.contents);

      return config;
    },
  ]);
};

const withAdyenAndroid = (defaultConfig) => {
  const configWithMainActivity = withMainActivity(
    defaultConfig,
    async (config) => {
      const mainActivity = config.modResults;
      mainActivity.contents = mainActivity.contents.replace(
        'import com.facebook.react.ReactRootView;\n',
        'import com.facebook.react.ReactRootView;\nimport com.adyenreactnativesdk.AdyenCheckout;\n'
      );
      mainActivity.contents = mainActivity.contents.replace(
        'super.onCreate(null);\n  }',
        'super.onCreate(null);\n    AdyenCheckout.setLauncherActivity(this);\n  }'
      );
      return config;
    }
  );

  const configWithManifest = withAndroidManifest(
    configWithMainActivity,
    async (config) => {
      const mainActivity = config.modResults;
      // Add com.adyenreactnativesdk.component.dropin.AdyenCheckoutService service
      // after com.facebook.react.HeadlessJsTaskService
      mainActivity.manifest.application = [
        // @ts-expect-error - manifest is not well typed
        {
          ...mainActivity.manifest.application?.[0],
          service: [
            {
              $: {
                'android:name':
                  'com.adyenreactnativesdk.component.dropin.AdyenCheckoutService',
                'android:exported': 'false',
              },
            },
          ],
        },
      ];
      return config;
    }
  );

  return configWithManifest;
};

const withAdyenIos = (defaultConfig) => {
  const appDelegate = withAppDelegate(defaultConfig, async (config) => {
    const appDelegate = config.modResults;
    appDelegate.contents = appDelegate.contents.replace(
      '#import "AppDelegate.h"\n\n',
      '#import "AppDelegate.h"\n\n#import <adyen-react-native/ADYRedirectComponent.h>\n'
    );
    appDelegate.contents = appDelegate.contents.replace(
      /\/\/ Linking API.*\n.*\n.*\n}/g,
      `// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  // Adyen SDK
  return [ADYRedirectComponent applicationDidOpenURL:url];
}`
    );
    return config;
  });
  return appDelegate;
};

module.exports = function (defaultConfig) {
  return withPodsPreprocessingFix(
    withAdyenIos(withAdyenAndroid(defaultConfig))
  );
};
