## iOS: Swift Package Manager

Swift Package Manager (SPM) is the iOS integration going forward. CocoaPods trunk is becoming read-only: the CocoaPods team plans to stop accepting new podspecs on December 2, 2026 (see the [CocoaPods blog](https://blog.cocoapods.org/CocoaPods-Specs-Repo/)). New releases of Swift libraries, including [Adyen iOS](https://github.com/Adyen/adyen-ios), will be distributed through SPM only. CocoaPods can only resolve versions that are already published to trunk.

SPM is the recommended iOS integration. It requires **React Native 0.87.1 or newer**. `@adyen/react-native` ships its own `ios/Package.swift` for React Native's SPM autolinking.

Older React Native versions use CocoaPods. The CocoaPods integration also gets Adyen iOS as a Swift package, so it is not limited to the Adyen iOS versions published to CocoaPods trunk (see [iOS: CocoaPods](#ios-cocoapods)).

Expo SDK 58 ships a preview SwiftPM autolinking plugin. With `expo` 58.0.17 or newer, `@adyen/react-native` links through it the same way as in a bare React Native app, through its `ios/Package.swift`; this setup is tested in CI. Earlier 58.0.x patch releases cannot build the `ExpoModulesJSI` framework that the plugin needs. Expo's SPM support is a preview, and CocoaPods stays Expo's default. Earlier Expo SDKs can only use CocoaPods.

To use SPM, use the `@adyen/react-native` config plugin from this release or newer: it adds `import adyen_react_native` to `AppDelegate.swift`, which SPM builds need. After `npx expo prebuild`, convert the project from the app's root directory and delete `ios/Podfile`, which the conversion leaves in an unusable state. Expo apps have no `@react-native-community/cli`, so `npx react-native spm` is not available; run React Native's script with Expo's autolinking config instead:

```bash
node node_modules/react-native/scripts/setup-apple-spm.js add --deintegrate --yes --config-command '["node","--no-warnings","--eval","require('"'"'expo/bin/autolinking'"'"')","expo-modules-autolinking","react-native-config","--json","--platform","ios"]'
rm ios/Podfile
```

Notes on the SPM integration:

* React Native 0.87 templates create CocoaPods-integrated Xcode projects, so converting an existing app needs `npx react-native spm add --deintegrate` once from the app's root directory (see the [README](../README.md#manual-integration)).
* React Native marks SPM support as experimental in 0.87.
* `@react-native-community/cli` 20.x detects the iOS project only through `ios/Podfile`. If your SPM app no longer has a Podfile, React Native's SPM tooling fails with `CLI config did not provide project.ios.sourceDir`. Point the tooling at a CLI config wrapper that fills in `project.ios` with `node node_modules/react-native/scripts/setup-apple-spm.js update --config-command '<argv JSON>'`, where the wrapper is a small Node script that runs the CLI `config` command and supplies the missing `project.ios` fields.
* The package resolves [Adyen iOS](https://github.com/Adyen/adyen-ios) from GitHub at the exact version the podspec pins (5.27.0) and declares iOS 15 as its minimum, matching React Native's SPM autolinking floor.
* Adyen iOS splits into several modules (`Adyen`, `AdyenActions`, `AdyenDropIn`, ...). App code that only does `import Adyen` and uses `RedirectComponent` or `DropInComponent` must also `import adyen_react_native`, which re-exports those modules. Do not qualify those types with the `Adyen.` module prefix (for example, write `DropInComponent.Style`, not `Adyen.DropInComponent.Style`). The same applies to CocoaPods.

## iOS: CocoaPods

React Native apps older than 0.87.1 and Expo apps use CocoaPods by default. The `adyen-react-native` podspec gets [Adyen iOS](https://github.com/Adyen/adyen-ios) as a Swift package through React Native's `spm_dependency` helper, pinned to the same exact version as `ios/Package.swift` (5.27.0). CocoaPods installs no `Adyen`, `Adyen3DS2` or `AdyenNetworking` pods; after upgrading `@adyen/react-native`, `pod install` removes them from `Podfile.lock`.

* `spm_dependency` is defined by React Native's `react_native_pods.rb`, which the Podfiles of React Native CLI and Expo apps load. Supported versions are React Native 0.79 and newer and Expo SDK 54 and newer.
* Xcode resolves the Swift packages (`adyen-ios` and the packages it depends on, such as `adyen-3ds2-ios` and `adyen-networking-ios`) from GitHub when it first opens or builds the workspace. Build machines need network access to `github.com`. Xcode records the resolved versions in `<App>.xcworkspace/xcshareddata/swiftpm/Package.resolved` and caches the checkouts in DerivedData (`SourcePackages`).
* `Adyen3DS2.framework` is a dynamic framework. The podspec adds it to the frameworks that the "[CP] Embed Pods Frameworks" build phase embeds into the app, as for frameworks shipped by pods.
* Unit test targets must use `inherit! :search_paths`. With `inherit! :complete`, the test bundle links `adyen-react-native` a second time, Xcode builds the Adyen package products as dynamic frameworks that nothing links, and the app fails to link with undefined Adyen symbols. `pod install` prints a warning in that case.
* Do not add an `Adyen` pod to the Podfile: the app would contain Adyen iOS twice.
* App code must `import adyen_react_native` to use `RedirectComponent` or `DropInComponent`, as with SPM (see above).
* `pod install` prints `[SPM] WARNING!!! Pod adyen-react-native is using swift package(s) ... with static linking, this might cause linker errors`. React Native prints it for every `spm_dependency` pod in apps without `use_frameworks! :linkage => :dynamic`. Apps link `adyen-react-native` without `use_frameworks!` as long as test targets use `inherit! :search_paths`.

## Adyen Android SDK 5.22.0: Kotlin and Android SDK requirements

Adyen Android SDK 5.22.0 sets three build requirements for the Android app that consumes `@adyen/react-native`:

- **Kotlin 2.3 metadata.** The SDK is compiled with Kotlin 2.3.0. The app must build with Kotlin Gradle plugin 2.3.0, or with 2.2.20 on Expo SDK 54, because a Kotlin 2.2 compiler can still read Kotlin 2.3 metadata.
- **Android API 36.** The AAR metadata of the SDK requires the app to compile against API 36 or later. Otherwise `:app:checkDebugAarMetadata` fails with "requires libraries and applications that depend on it to compile against version 36 or later of the Android APIs".
- **Android Gradle plugin 8.9.1.** AndroidX dependencies of the SDK (`androidx.activity:activity` 1.11.0, `androidx.browser:browser` 1.9.0) require Android Gradle plugin 8.9.1 or later.

Supported versions are React Native 0.79 and newer, and Expo SDK 54 and newer. Set the values for your version in [Bare React Native](#bare-react-native) or [Expo](#expo).

React Native 0.78 and older, and Expo SDK 52 and older, which use them, are not supported with Adyen Android SDK 5.22.0: their React Native Gradle plugin cannot use Kotlin 2.x. Expo SDK 53 is not supported either: Expo maps the Kotlin version to a fixed list of KSP versions, and the list in SDK 53 ends at Kotlin 2.1.20, which cannot read Kotlin 2.3 metadata.

Tested with React Native 0.79.7, 0.80.3, 0.85.3, 0.87.1 and the latest release, and with Expo SDK 54, 55, 57 and 58.

### Bare React Native

Set these values in `android/build.gradle`:

| React Native   | `kotlinVersion`                                    | Kotlin Gradle plugin classpath | `compileSdkVersion`   | `targetSdkVersion` | `buildToolsVersion`         | Android Gradle plugin |
| -------------- | -------------------------------------------------- | ------------------------------ | --------------------- | ------------------ | --------------------------- | --------------------- |
| 0.78 and older | not supported: Gradle plugin cannot use Kotlin 2.x | –                              | –                     | –                  | –                           | –                     |
| 0.79           | `"2.3.0"`                                          | `${kotlinVersion}`             | `36`                  | `36`               | `"36.0.0"`                  | `8.9.1`               |
| 0.80           | `"2.3.0"`                                          | `${kotlinVersion}`             | `36`                  | `36`               | `"36.0.0"`                  | template default      |
| 0.81+          | `"2.3.0"`                                          | `${kotlinVersion}`             | already `36` or newer | already `36`       | already `"36.0.0"` or newer | template default      |

```groovy
buildscript {
    ext {
        buildToolsVersion = "36.0.0"
        compileSdkVersion = 36
        targetSdkVersion = 36
        kotlinVersion = "2.3.0"
    }
    dependencies {
        // React Native 0.79 only
        classpath("com.android.tools.build:gradle:8.9.1")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")
    }
}
```

Keep any version that is already newer than the snippet.

- **Kotlin Gradle plugin classpath.** The React Native 0.79 to 0.87 templates declare `kotlinVersion` 2.0.21 to 2.2.0 but leave the Kotlin Gradle plugin classpath unversioned, so raising `kotlinVersion` alone has no effect. The classpath must reference `${kotlinVersion}`.
- **Android SDK on React Native 0.79 and 0.80.** Their templates use API 35 and build tools 35.0.0. The 0.81 and 0.85 templates use API 36, and the 0.87 template compiles against API 37 with build tools 37.0.0.
- **Android Gradle plugin on React Native 0.79.** The template declares the Android Gradle plugin classpath without a version, so the version comes from the React Native Gradle plugin, which resolves 8.8.2. Pinning 8.9.1 overrides the version chosen by React Native and works with the Gradle 8.13 wrapper of the 0.79 template, so the wrapper does not need to change. React Native 0.80 and newer resolve Android Gradle plugin 8.9.1 or later and need no pin.

### Expo

Install [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/) and set the values for your Expo SDK in `app.json`:

```bash
npx expo install expo-build-properties
```

| Expo SDK | `kotlinVersion` | `compileSdkVersion` | `targetSdkVersion` |
| -------- | --------------- | ------------------- | ------------------ |
| 54       | `"2.2.20"`      | `36`                | `36`               |
| 55–57    | `"2.3.0"`       | `36`                | `36`               |
| 58+      | `"2.3.0"`       | already `37`        | already `36`       |

The Expo SDK 54 and 55 templates already default to API 36; setting the values keeps them explicit.

For example, on Expo SDK 55–57:

```json
{
  "expo": {
    "plugins": [
      "@adyen/react-native",
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.3.0",
            "compileSdkVersion": 36,
            "targetSdkVersion": 36
          }
        }
      ]
    ]
  }
}
```

Then run `npx expo prebuild --platform android --clean`.

- **Kotlin Gradle plugin.** `expo-build-properties` writes `android.kotlinVersion` to `android/gradle.properties`, but Expo SDK 54–57 templates keep an unversioned Kotlin Gradle plugin classpath in `android/build.gradle`. During prebuild the `@adyen/react-native` config plugin rewrites that classpath to follow `android.kotlinVersion`, the same way Expo SDK 58+ templates already do, so no other change to `android/build.gradle` is needed:

  ```groovy
  def kotlinVersion = findProperty('android.kotlinVersion')
  classpath(kotlinVersion ? "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion" : 'org.jetbrains.kotlin:kotlin-gradle-plugin')
  ```

  A classpath that already has a version is left unchanged.

- **Kotlin 2.2.20 on Expo SDK 54.** Expo maps the Kotlin version to a fixed list of KSP versions. The list in SDK 54 ends at Kotlin 2.2.20, and SDK 55 does not include releases newer than 2.3.0, so use exactly the versions in the table.

- **Expo SDK 58+ already uses API 37.** The template compiles against API 37, which Expo SDK 58 modules require, and targets API 36, so only `kotlinVersion` is needed. Lowering `compileSdkVersion` to 36 there fails the AAR metadata check of Expo modules.

### Android API level

Google Play requires new Android phone and tablet app submissions and updates to target Android 16 (API level 36) or higher. See [Google Play's target API level requirement](https://developer.android.com/google/play/requirements/target-sdk). This is set by the consuming application, not this library. The snippets above set it for bare React Native and Expo SDK 54–57. The React Native 0.81, 0.85 and 0.87 templates and the Expo SDK 54, 55 and 58 templates already target API 36.

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
