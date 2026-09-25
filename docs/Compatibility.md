# Compatibility

Version and platform requirements for the `@adyen/react-native` v6-alpha bridge. This page
separates three kinds of requirement:

- **Consumer requirements** — versions your application must provide (peer dependencies).
- **Root-project overrides** — build settings your application can override; the library only
  supplies fallbacks.
- **Library-owned** — versions this library pins internally; you neither set nor override them.

For what each platform and flow can actually do at runtime see [FeatureSupport.md](./FeatureSupport.md),
for configuration options see [Configuration.md](./Configuration.md), and for upgrade steps see
[MigrationGuide.md](./MigrationGuide.md).

## Consumer requirements (peer dependencies)

Declared in `package.json` `peerDependencies`:

| Dependency     | Requirement | Notes                                                                                                            |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `react-native` | `>=0.82`    | Required. The runtime modules are TurboModule-only; legacy bridge registration is not supported.                 |
| `react`        | `*`         | Any version compatible with your React Native.                                                                   |
| `expo`         | `>=56`      | Optional (`peerDependenciesMeta.expo.optional = true`); required only if you use the bundled Expo config plugin. |

React Native 0.81 and earlier are not supported. Both packed consumer fixtures and the active CI
matrix validate the React Native 0.82.4 floor and the repository's current development version.

## iOS

- **Deployment target: iOS 16.0.** Declared by `adyen-react-native.podspec`
  (`s.platform = :ios, "16.0"`); your app's iOS deployment target must be 16.0 or higher.
- **Adyen iOS SDK `6.0.0-alpha.1`** is library-owned. It is vendored as per-module xcframeworks
  built from `package.json`'s `adyen.ios` value (the single source of truth), together with the
  pinned transitive pods `AdyenNetworking 3.0.1` and `Adyen3DS2 2.4.4`. You do not add or pin the
  Adyen iOS pods yourself.
- Install pods after adding the package (`cd ios && pod install`, or `yarn app pod` in this repo).

## Android

The library reads its Android build settings from `android/gradle.properties` and lets the consuming
root project override each one through `rootProject.ext` (see `getExtOrDefault` /
`getExtOrIntegerDefault` in `android/build.gradle`). The values below are the library **fallbacks**:

| Setting             | Library fallback | Property key                    |
| ------------------- | ---------------- | ------------------------------- |
| `minSdkVersion`     | `21`             | `ReactNative_minSdkVersion`     |
| `compileSdkVersion` | `36`             | `ReactNative_compileSdkVersion` |
| `targetSdkVersion`  | `36`             | `ReactNative_targetSdkVersion`  |
| Kotlin              | `2.3.21`         | `ReactNative_kotlinVersion`     |
| NDK                 | `27.1.12297006`  | `ReactNative_ndkVersion`        |

> [!NOTE]
> The example app in `example/android/build.gradle` sets `minSdkVersion = 24`. That is the example's
> own value, not the library minimum — the library's fallback minimum is API 21.

Library-owned Android versions (not consumer-set): the Adyen Android SDK `6.0.0-alpha.1`
(`package.json` `adyen.android`, consumed as `com.adyen.checkout:drop-in`), the Android Gradle plugin
`8.7.3` (`android/build.gradle`), and the Compose BOM `2026.05.01` (`android/dependencies.gradle`,
aligned to the version shipped by the Adyen SDK).

### Targeting Android 16 (API level 36)

Google Play requires new phone and tablet app submissions and updates to target Android 16
(API level 36) or higher. See
[Google Play's target API level requirement](https://developer.android.com/google/play/requirements/target-sdk).
This is set by the consuming application, not this library; override the fallbacks in the Android
app that consumes `@adyen/react-native`:

```groovy
buildscript {
    ext {
        compileSdkVersion = 36
        targetSdkVersion = 36
    }
}
```
