const {withMainActivity, withAppDelegate, withAppBuildGradle, withProjectBuildGradle} = require('@expo/config-plugins');

const withAdyenAndroid = (config) => {
  const configWithMainActivity = withMainActivity(config, async (newConfig) => {
    const mainActivity = newConfig.modResults;
    mainActivity.contents = mainActivity.contents.replace(
      'public class MainActivity extends ReactActivity {',
      'import com.adyenreactnativesdk.AdyenCheckout;\n\npublic class MainActivity extends ReactActivity {',
    );

    // on Create
    mainActivity.contents = mainActivity.contents.replace(
      'super.onCreate(null);\n  }',
      'super.onCreate(null);\n    AdyenCheckout.setLauncherActivity(this);\n  }',
    );

    // on NewIntent
    if (mainActivity.contents.includes('public void onNewIntent(Intent intent) {')) {
      mainActivity.contents = mainActivity.contents.replace(
        'super.onNewIntent(intent);\n  }',
        'super.onNewIntent(intent);\n    AdyenCheckout.handleIntent(intent);\n  }',
      );
    } else {
      mainActivity.contents = mainActivity.contents.replace(
        /}\n$/,
        "\n" +
        "  @Override\n" +
        "  public void onNewIntent(Intent intent) {\n" +
        "    super.onNewIntent(intent);\n" +
        "    AdyenCheckout.handleIntent(intent);\n" +
        "  }\n" + 
        "}\n",
      );
    }

    // on ActivityResult
    if (
      mainActivity.contents.includes(
        'public void onActivityResult(int requestCode, int resultCode, Intent data) {',
      )
    ) {
      mainActivity.contents = mainActivity.contents.replace(
        'super.onActivityResult(requestCode, resultCode, data);\n  }',
        'super.onActivityResult(requestCode, resultCode, data);\n    AdyenCheckout.handleActivityResult(requestCode, resultCode, data);\n  }',
      );
    } else {
      mainActivity.contents = mainActivity.contents.replace(
        /}\n$/,
        "\n" +
        "  @Override\n" +
        "  public void onActivityResult(int requestCode, int resultCode, Intent data) {\n"+
        "    super.onActivityResult(requestCode, resultCode, data);\n" +
        "    AdyenCheckout.handleActivityResult(requestCode, resultCode, data);\n" +
        "  }\n" + 
        "}\n",
      );
    }

    return newConfig;
  });

  return configWithMainActivity;
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
      `#import "AppDelegate.h"\n\n${importLine}\n`,
    );
    appDelegateModResults.contents = appDelegateModResults.contents.replace(
      /\/\/ Linking API.*\n.*\n.*\n}/g,
      `// Linking API
  - (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
    // Adyen SDK
    return [ADYRedirectComponent applicationDidOpenURL:url];
  }`,
    );
    return newConfig;
  });
  return appDelegate;
};

module.exports = function (config, iosFramework = 'dynamic') {
  return withAdyenIos(withAdyenAndroid(config), iosFramework);
};
