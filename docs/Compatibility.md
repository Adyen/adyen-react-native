`@adyen/react-native` supports React Native 0.79 and newer and Expo SDK 54 and newer. Follow [Installation](../README.md#installation) first, then the steps for your app below.

_React Native_ means apps created with the React Native Community CLI (`npx @react-native-community/cli init`). Expo apps have their own steps.

## iOS: CocoaPods

For React Native apps and Expo apps. Install the pods (`pod install` in `ios` for React Native, `npx expo prebuild` for Expo). This downloads the Adyen iOS packages from GitHub, and so does the first Xcode build.

If your Podfile has a test target with `inherit! :complete` (for example `target 'MyAppTests'` from an older React Native template), change it to `inherit! :search_paths`. Otherwise the app fails to link with undefined Adyen symbols.

`pod install` prints `[SPM] WARNING!!! Pod adyen-react-native is using swift package(s) ... with static linking`. You can ignore it; you do not need `use_frameworks!`.

## iOS: Swift Package Manager

For React Native 0.87.1 and newer apps that use SPM ([switching to SPM](https://reactnative.dev/blog/2026/08/11/react-native-0.87#experimental-swift-package-manager-support-for-ios)). Expo apps use [CocoaPods](#ios-cocoapods). Run `npx react-native spm` after a fresh clone and in CI. Building the app downloads the Adyen iOS packages from GitHub.

## Adyen Android SDK 5.22.0: Kotlin and Android SDK requirements

Your Android app must build with:

- Kotlin Gradle plugin 2.3.0 (2.2.20 on Expo SDK 54).
- `compileSdkVersion` 36 or newer. Otherwise `:app:checkDebugAarMetadata` fails with "requires libraries and applications that depend on it to compile against version 36 or later of the Android APIs".
- Android Gradle plugin 8.9.1 or newer.

Set the values for your version in [React Native](#react-native) or [Expo](#expo).

### React Native

1. Set these values in `android/build.gradle`. Keep any value that is already higher.

   | React Native | `kotlinVersion` | Kotlin Gradle plugin classpath | `compileSdkVersion`   | `targetSdkVersion` | `buildToolsVersion`         | Android Gradle plugin |
   | ------------ | --------------- | ------------------------------ | --------------------- | ------------------ | --------------------------- | --------------------- |
   | 0.79         | `"2.3.0"`       | `${kotlinVersion}`             | `36`                  | `36`               | `"36.0.0"`                  | `8.9.1`               |
   | 0.80         | `"2.3.0"`       | `${kotlinVersion}`             | `36`                  | `36`               | `"36.0.0"`                  | template default      |
   | 0.81+        | `"2.3.0"`       | `${kotlinVersion}`             | already `36` or newer | already `36`       | already `"36.0.0"` or newer | template default      |

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

   Add `:${kotlinVersion}` to the Kotlin Gradle plugin classpath. Without it, `kotlinVersion` has no effect.
   On React Native 0.79, add `:8.9.1` to the existing `com.android.tools.build:gradle` classpath rather than adding a new line.

2. Follow the [Android setup](../README.md#manual-integration).

### Expo

1. Install [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/):

   ```bash
   npx expo install expo-build-properties
   ```

2. In `app.json`, add the `@adyen/react-native` plugin and set the values for your Expo SDK. Use exactly these Kotlin versions.

   | Expo SDK | `kotlinVersion` | `compileSdkVersion` | `targetSdkVersion` |
   | -------- | --------------- | ------------------- | ------------------ |
   | 54       | `"2.2.20"`      | `36`                | `36`               |
   | 55–57    | `"2.3.0"`       | `36`                | `36`               |
   | 58+      | `"2.3.0"`       | do not set          | do not set         |

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

3. Run `npx expo prebuild --platform android --clean`.

## Android: R8 and 3D Secure 2 in release builds

Older R8 versions break native 3D Secure 2 payments in release builds that have minification enabled. The app can crash without an error while the shopper authenticates. Debug builds and most automated tests are not affected, so the problem shows up only after the app goes live. React Native 0.87.1 and Android Gradle plugin (AGP) 9 are affected when the AGP version bundles an older R8.

To fix it, use the first option that works for your app:

1. Use AGP 9.4.1 or later.
2. Pin R8 9.4.18 or later in `android/settings.gradle`:

   ```groovy
   buildscript {
       repositories {
           google()
           mavenCentral()
       }
       dependencies {
           classpath("com.android.tools:r8:9.4.18")
       }
   }
   ```

3. Add `-dontoptimize` to `android/app/proguard-rules.pro`. This turns off R8 optimizations, so use it only if that is acceptable for your app.
4. Use an older 3D Secure 2 SDK, in `android/app/build.gradle`:

   ```groovy
   dependencies {
       implementation("com.adyen.threeds:adyen-3ds2") {
           version { strictly "2.2.27" }
       }
   }
   ```

The build check below cannot see options 3 and 4. If you use one of them, set `adyen.skipR8Check=true`.

On Expo, `npx expo prebuild` regenerates `android/`, so edits to `settings.gradle` do not last. The `@adyen/react-native` plugin pins R8 9.4.18 for you, unless your `settings.gradle` already pins R8. Use the plugin options instead of the steps above:

```json
{
  "expo": {
    "plugins": [["@adyen/react-native", { "r8Version": "9.4.18" }]]
  }
}
```

- `r8Version` pins another R8 version. `false` turns the pin off, for example when you use AGP 9.4.1 or later and want no pin.
- `skipR8Check: true` sets `adyen.skipR8Check=true` in `gradle.properties`. Use it with option 3 or 4. For option 3, also add `-dontoptimize` through `expo-build-properties` (`android.extraProguardRules`).

Test 3D Secure 2 payments on a release build (`npx react-native run-android --mode release`, or an installed release APK or AAB) before you publish your app, with minification enabled as in production.

When you build a release with an affected R8 version, `@adyen/react-native` fails the build with this advice. These Gradle properties, set with `-P` or in `gradle.properties`, change the behavior:

| Property                       | Effect                                                      |
| ------------------------------ | ----------------------------------------------------------- |
| `adyen.failOnAffectedR8=false` | Prints the error as a warning instead of failing the build. |
| `adyen.skipR8Check=true`       | Turns the check off. Use it with option 3 or 4.             |
