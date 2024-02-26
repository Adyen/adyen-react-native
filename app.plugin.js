const {
  withAndroidManifest,
  withMainActivity,
  withAppDelegate,
} = require('@expo/config-plugins');

const withAdyenAndroid = (config) => {
  const configWithMainActivity = withMainActivity(config, async (newConfig) => {
    const mainActivity = newConfig.modResults;
    mainActivity.contents = mainActivity.contents.replace(
      'public class MainActivity extends ReactActivity {',
      'import com.adyenreactnativesdk.AdyenCheckout;\n\npublic class MainActivity extends ReactActivity {'
    );
    mainActivity.contents = mainActivity.contents.replace(
      'super.onCreate(null);\n  }',
      'super.onCreate(null);\n    AdyenCheckout.setLauncherActivity(this);\n  }'
    );
    return newConfig;
  });

  const configWithManifest = withAndroidManifest(
    configWithMainActivity,
    async (newConfig) => {
      const mainActivity = newConfig.modResults;
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
      return newConfig;
    }
  );

  return configWithManifest;
};

const withAdyenIos = (config, iosFramework) => {
  const importLine =
    iosFramework === 'static'
      ? '#import <adyen_react_native/ADYRedirectComponent.h>'
      : '#import <adyen-react-native/ADYRedirectComponent.h>';
  const appDelegate = withAppDelegate(config, async (newConfig) => {
    const appDelegateModResults = newConfig.modResults;
    appDelegateModResults.contents = appDelegateModResults.contents.replace(
      '#import "AppDelegate.h"\n\n',
      `#import "AppDelegate.h"\n\n${importLine}\n`
    );
    appDelegateModResults.contents = appDelegateModResults.contents.replace(
      /\/\/ Linking API.*\n.*\n.*\n}/g,
      `// Linking API
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  // Adyen SDK
  return [ADYRedirectComponent applicationDidOpenURL:url];
}`
    );
    return newConfig;
  });
  return appDelegate;
};

module.exports = function (config, iosFramework = 'dynamic') {
  return withAdyenIos(withAdyenAndroid(config), iosFramework);
};
