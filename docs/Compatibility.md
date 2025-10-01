## React-Native v0.73

* set `kotlin` in `node_modules/@react-native/gradle-plugin/gradle/libs.versions.toml` to at least **1.9.10**
* set `apiVersion` in `node_modules/@react-native/gradle-plugin/build.gradle.kts` to at least **1.7**

> [!NOTE]
> Google has introduced new [target API level requirements for Google Play apps](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) on August 31, 2024.
> React-Native version **73** and below are considered deprecated.

## React-Native v0.72 and below

* make sure your Java version is 17;
* update Android compileTarget to 34 in `android/build.gradle`;
* set `classpath("com.android.tools.build:gradle:8.1.4")` in `android/build.gradle`;
* enable `buildConfig` in `android/app/build.gradle` by adding `android.buildFeatures.buildConfig = true`.
