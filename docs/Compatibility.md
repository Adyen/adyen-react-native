`@adyen/react-native` supports React Native 0.79 and newer and Expo SDK 54 and newer.

## iOS: integration by version

With CocoaPods, the `adyen-react-native` pod gets [Adyen iOS](https://github.com/Adyen/adyen-ios) as a Swift package through React Native's `spm_dependency`, so `pod install` needs access to github.com and Adyen iOS is not installed as an `Adyen` pod. With Swift Package Manager, the app has no Podfile and links `@adyen/react-native` through `ios/Package.swift`.

| React Native   | Expo SDK                                   | CocoaPods app  | SPM app                                               |
| -------------- | ------------------------------------------ | -------------- | ----------------------------------------------------- |
| 0.78 and older | 53 and older                               | not supported  | not supported                                         |
| 0.79 – 0.86    | 54 (0.81), 55 (0.83), 56 (0.85), 57 (0.86) | supported      | not supported                                         |
| 0.87           | –                                          | supported      | supported from 0.87.1 (experimental)                  |
| 0.88           | 58 (0.88)                                  | supported      | supported; on Expo, `expo` 58.0.17 or newer (preview) |
| 0.89 and newer | –                                          | not yet tested | not yet tested                                        |

## iOS: Swift Package Manager

Swift Package Manager (SPM) is the recommended iOS integration. CocoaPods trunk stops accepting new podspecs on December 2, 2026 (see the [CocoaPods blog](https://blog.cocoapods.org/CocoaPods-Specs-Repo/)), and new Adyen iOS releases will ship through SPM only.

- SPM needs React Native 0.87.1 or newer. React Native marks SPM support as experimental in 0.87.
- `@adyen/react-native` ships `ios/Package.swift`. It gets Adyen iOS 5.27.0 from GitHub and requires iOS 15 or newer.
- React Native 0.87 templates create CocoaPods projects. Convert an existing app once with `npx react-native spm add --deintegrate` from the app's root directory (see the [README](../README.md#manual-integration)).
- If your app has no `ios/Podfile`, `@react-native-community/cli` 20.x cannot find the iOS project, and React Native's SPM tooling fails with `CLI config did not provide project.ios.sourceDir`. Write a small Node script that runs the CLI `config` command and fills in `project.ios`, then pass it with `node node_modules/react-native/scripts/setup-apple-spm.js update --config-command '<argv JSON>'`.
- App code that uses `RedirectComponent` or `DropInComponent` must `import adyen_react_native`. Do not prefix those types with `Adyen.` (write `DropInComponent.Style`, not `Adyen.DropInComponent.Style`).

### SPM on Expo

SPM on Expo is a preview and needs Expo SDK 58 with `expo` 58.0.17 or newer. CocoaPods stays Expo's default, and earlier Expo SDKs use CocoaPods only.

1. Use the `@adyen/react-native` config plugin from this release or newer. It adds `import adyen_react_native` to `AppDelegate.swift`.
2. Run `npx expo prebuild`.
3. From the app's root directory, convert the project and delete `ios/Podfile`, which the conversion leaves unusable. Expo apps have no `npx react-native spm`, so run React Native's script with Expo's autolinking config:

```bash
node node_modules/react-native/scripts/setup-apple-spm.js add --deintegrate --yes --config-command '["node","--no-warnings","--eval","require('"'"'expo/bin/autolinking'"'"')","expo-modules-autolinking","react-native-config","--json","--platform","ios"]'
rm ios/Podfile
```

## iOS: CocoaPods

React Native apps older than 0.87.1 and Expo apps use CocoaPods by default.

- `pod install` and the first Xcode build need network access to `github.com` to resolve the Adyen Swift packages.
- Do not add an `Adyen` pod to your Podfile: the app would contain Adyen iOS twice. After you upgrade `@adyen/react-native`, `pod install` removes the `Adyen`, `Adyen3DS2` and `AdyenNetworking` pods from `Podfile.lock`.
- App code that uses `RedirectComponent` or `DropInComponent` must `import adyen_react_native` and must not write `Adyen.DropInComponent`, as with SPM.
- Unit test targets must use `inherit! :search_paths`. With `inherit! :complete`, the app fails to link with undefined Adyen symbols, and `pod install` prints a warning.
- `pod install` prints `[SPM] WARNING!!! Pod adyen-react-native is using swift package(s) ... with static linking`. You do not need `use_frameworks!` as long as test targets use `inherit! :search_paths`.

## Adyen Android SDK 5.22.0: Kotlin and Android SDK requirements

Adyen Android SDK 5.22.0 requires your Android app to build with:

- Kotlin Gradle plugin 2.3.0 (2.2.20 on Expo SDK 54).
- `compileSdkVersion` 36 or newer. Otherwise `:app:checkDebugAarMetadata` fails with "requires libraries and applications that depend on it to compile against version 36 or later of the Android APIs".
- Android Gradle plugin 8.9.1 or newer.

Set the values for your version in [Bare React Native](#bare-react-native) or [Expo](#expo). Keep any version that is already newer.

### Bare React Native

Set these values in `android/build.gradle`:

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

- The Kotlin Gradle plugin classpath must reference `${kotlinVersion}`. The templates leave it unversioned, so raising `kotlinVersion` alone has no effect.
- On React Native 0.79, the Android Gradle plugin 8.9.1 pin works with the template's Gradle 8.13 wrapper, so the wrapper does not need to change.

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

- Use exactly the Kotlin versions in the table. Expo maps each Kotlin version to a KSP version, and Expo SDK 54 supports Kotlin up to 2.2.20 only.
- On Expo SDK 54–57, the `@adyen/react-native` config plugin makes the Kotlin Gradle plugin classpath follow `kotlinVersion` during prebuild, so you do not need to change `android/build.gradle`.
- On Expo SDK 58+, set only `kotlinVersion`. Do not lower `compileSdkVersion` to 36: Expo modules require API 37.

### Android API level

Google Play requires new apps and app updates to target API level 36 or higher ([target API level requirement](https://developer.android.com/google/play/requirements/target-sdk)); the values above already meet it.
