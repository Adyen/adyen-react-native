## iOS: Swift Package Manager

`@adyen/react-native` ships its own `ios/Package.swift` for React Native's Swift Package Manager (SPM) autolinking. SPM is the recommended iOS integration.

* SPM integration requires **React Native 0.87.1 or newer** (`npx react-native spm add --deintegrate`, because React Native templates ship CocoaPods-integrated Xcode projects). Older versions and Expo prebuild projects must use CocoaPods.
* CocoaPods (`adyen-react-native.podspec`) is **deprecated** but still functional and supported for apps that cannot use SPM yet, including Expo prebuild projects. `pod install` prints a deprecation warning for the pod. Both integrations pin the same Adyen iOS version. CocoaPods support may be removed in a future major version.
* React Native marks SPM support as experimental in 0.87.
* `@react-native-community/cli` 20.x detects the iOS project only through `ios/Podfile`. If your SPM app no longer has a Podfile, React Native's SPM tooling fails with `CLI config did not provide project.ios.sourceDir`. Point the tooling at a CLI config wrapper that fills in `project.ios` with `node node_modules/react-native/scripts/setup-apple-spm.js update --config-command '<argv JSON>'`. This repository's example app does that with [`example/scripts/spm-cli-config.js`](../example/scripts/spm-cli-config.js).
* The package resolves [Adyen iOS](https://github.com/Adyen/adyen-ios) from GitHub at the exact version the podspec pins (5.26.0) and declares iOS 15 as its minimum, matching React Native's SPM autolinking floor.
* Adyen iOS splits into several modules under SPM (`Adyen`, `AdyenActions`, `AdyenDropIn`, ...), while the CocoaPod is the single `Adyen` module. App code that only does `import Adyen` and uses `RedirectComponent` or `DropInComponent` must also `import adyen_react_native`, which re-exports those modules. This import works with CocoaPods as well. Do not qualify those types with the `Adyen.` module prefix (for example, write `DropInComponent.Style`, not `Adyen.DropInComponent.Style`).

## Android API level

Google Play requires new Android phone and tablet app submissions and updates to target Android 16 (API level 36) or higher. See [Google Play's target API level requirement](https://developer.android.com/google/play/requirements/target-sdk). This is set by the consuming application, not this library; configure the Android app that consumes `@adyen/react-native` with:

```groovy
buildscript {
    ext {
        compileSdkVersion = 36
        targetSdkVersion = 36
    }
}
```

## React-Native v0.73

* set `kotlin` in `node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml` to at least **1.9.10**
* set `apiVersion` in `node_modules/@react-native/gradle-plugin/build.gradle.kts` to at least **1.7**

> [!NOTE]
> React-Native version **73** and below are considered deprecated.

## React-Native v0.72 and below

* make sure your Java version is 17;
* update Android compileTarget to 34 in `android/build.gradle`;
* set `classpath("com.android.tools.build:gradle:8.1.4")` in `android/build.gradle`;
* enable `buildConfig` in `android/app/build.gradle` by adding `android.buildFeatures.buildConfig = true`.
