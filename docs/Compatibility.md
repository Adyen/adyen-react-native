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
