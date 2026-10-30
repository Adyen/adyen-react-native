## Adyen Android SDK 5.22.0: Kotlin and Android SDK requirements

Adyen Android SDK 5.22.0 sets three build requirements for the Android app that consumes `@adyen/react-native`:

- **Kotlin 2.3 metadata.** The SDK is compiled with Kotlin 2.3.0. The app must build with Kotlin Gradle plugin 2.3.0, or with 2.2.20 on Expo SDK 54, because a Kotlin 2.2 compiler can still read Kotlin 2.3 metadata.
- **Android API 36.** The AAR metadata of the SDK requires the app to compile against API 36 or later. Otherwise `:app:checkDebugAarMetadata` fails with "requires libraries and applications that depend on it to compile against version 36 or later of the Android APIs".
- **Android Gradle plugin 8.9.1.** AndroidX dependencies of the SDK (`androidx.activity:activity` 1.11.0, `androidx.browser:browser` 1.9.0) require Android Gradle plugin 8.9.1 or later.

React Native 0.78 and older, and Expo SDK 52 and older, which use them, fail first: their React Native Gradle plugin cannot use Kotlin 2.x. React Native 0.79, and Expo SDK 53, which uses it, can be raised to Kotlin 2.3 but ship Android Gradle plugin 8.8.2, so the build fails the AAR metadata check even with API 36. These versions are not supported with Adyen Android SDK 5.22.0.

Tested with React Native 0.80.3, 0.85.3, 0.87.1 and the latest release, and with Expo SDK 54, 55, 57 and 58.

### Bare React Native

The React Native 0.80, 0.81, 0.85 and 0.87 templates declare `kotlinVersion` 2.1.20 or 2.2.0 and leave the Kotlin Gradle plugin classpath unversioned. Raise `kotlinVersion` and make the classpath follow it in `android/build.gradle`:

```groovy
buildscript {
    ext {
        buildToolsVersion = "36.0.0"
        compileSdkVersion = 36
        targetSdkVersion = 36
        kotlinVersion = "2.3.0"
    }
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")
    }
}
```

Of these, only React Native 0.80 needs the Android SDK lines: its template uses API 35 and build tools 35.0.0. The 0.81 and 0.85 templates already use API 36, and the 0.87 template compiles against API 37. Keep any version that is already newer than the snippet.

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

- **Kotlin Gradle plugin.** `expo-build-properties` writes `android.kotlinVersion` to `android/gradle.properties`, but Expo SDK 54–57 templates keep an unversioned Kotlin Gradle plugin classpath in `android/build.gradle`. During prebuild the `@adyen/react-native` config plugin rewrites that classpath to follow `android.kotlinVersion`, the same way Expo SDK 58+ templates already do:

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
