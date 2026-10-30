// Copyright (c) 2026 Adyen N.V.

// Matches the unversioned Kotlin Gradle plugin classpath of Expo SDK 54-57
// templates. Versioned or parameterized declarations do not match.
const UNVERSIONED_KOTLIN_GRADLE_PLUGIN =
  /^([ \t]*)classpath\((['"])org\.jetbrains\.kotlin:kotlin-gradle-plugin\2\)[ \t]*$/m;

/**
 * Makes the Kotlin Gradle plugin follow `android.kotlinVersion` (set by
 * expo-build-properties), the same way Expo SDK 58+ templates do. Without it,
 * the plugin version bundled with React Native is used, which can be too old
 * for the Kotlin metadata of the Adyen Android SDK.
 */
export function setKotlinGradlePlugin(contents: string): string {
  return contents.replace(
    UNVERSIONED_KOTLIN_GRADLE_PLUGIN,
    (_match, indent: string) =>
      `${indent}def kotlinVersion = findProperty('android.kotlinVersion')\n` +
      `${indent}classpath(kotlinVersion ? "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion" : 'org.jetbrains.kotlin:kotlin-gradle-plugin')`
  );
}
