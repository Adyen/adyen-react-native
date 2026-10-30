#!/usr/bin/env node
// Copyright (c) 2026 Adyen N.V.

// Raises the Android toolchain of a generated CI fixture.
//
// Adyen Android SDK 5.22.0 is compiled with Kotlin 2.3.0 metadata and its AAR
// metadata requires apps to compile against Android API 36:
// - Kotlin: a consuming app must build with a Kotlin Gradle plugin (KGP)
//   >= 2.3.0. 2.3.0 is the version validated across React Native and Expo
//   SDK 55+: Expo SDK 55 maps Kotlin to a fixed list of KSP versions that does
//   not include newer releases. Expo SDK 54 is the exception, see
//   EXPO_KOTLIN_VERSIONS.
// - Android SDK: compileSdk, targetSdk and build tools are raised to 36. Google
//   Play requires targetSdk 36 as well.
//
// React Native fixtures are patched in android/build.gradle by the CLI below.
// Expo fixtures get the versions through expo-build-properties in app.json
// (see configure-expo-app.js); the @adyen/react-native config plugin then makes
// the KGP classpath follow android.kotlinVersion during prebuild. Expo SDK 58+
// templates compile against API 37, so only Kotlin is set there, see
// EXPO_DEFAULT_ANDROID_SDK.
//
// Usage: node configure-android-toolchain.js react-native [projectDir]

const fs = require('node:fs');
const path = require('node:path');

const KOTLIN_VERSION = '2.3.0';
const COMPILE_SDK_VERSION = 36;
const TARGET_SDK_VERSION = 36;
const BUILD_TOOLS_VERSION = '36.0.0';
const KGP_CLASSPATH =
  /classpath\((['"])org\.jetbrains\.kotlin:kotlin-gradle-plugin(?::([^'"]*))?\1\)/;
const KGP_PARAMETERIZED = /org\.jetbrains\.kotlin:kotlin-gradle-plugin:\$/;
const KGP_REFERENCE = /org\.jetbrains\.kotlin:kotlin-gradle-plugin/;
const KOTLIN_VERSION_EXT = /(kotlinVersion\s*=\s*)(['"])([^'"]+)\2/;
const COMPILE_SDK_EXT = /(compileSdkVersion\s*=\s*)(\d+)/;
const TARGET_SDK_EXT = /(targetSdkVersion\s*=\s*)(\d+)/;
const BUILD_TOOLS_EXT = /(buildToolsVersion\s*=\s*)(['"])([^'"]+)\2/;

// Expo SDK 54 maps Kotlin to KSP versions only up to 2.2.20. A 2.2.x compiler
// still reads Kotlin 2.3 metadata, so 2.2.20 is the newest option there.
const EXPO_KOTLIN_VERSIONS = { 54: '2.2.20' };

// From this Expo SDK on, the template compiles against API 37 and targets 36.
// Setting 36 through expo-build-properties would lower compileSdk and fail the
// AAR metadata check of Expo modules, so the template defaults are kept.
const EXPO_DEFAULT_ANDROID_SDK = 58;

const expoMajor = (expoVersionRange) =>
  Number((String(expoVersionRange).match(/\d+/) || [])[0]);

/** Picks the Kotlin version for an Expo SDK from its dependency range, e.g. "~54.0.36". */
function kotlinVersionForExpo(expoVersionRange) {
  return EXPO_KOTLIN_VERSIONS[expoMajor(expoVersionRange)] || KOTLIN_VERSION;
}

/** expo-build-properties options for an Expo SDK; null leaves a value to the template. */
function expoBuildPropertiesFor(expoVersionRange) {
  const keepTemplateSdk =
    expoMajor(expoVersionRange) >= EXPO_DEFAULT_ANDROID_SDK;
  return {
    kotlinVersion: kotlinVersionForExpo(expoVersionRange),
    compileSdkVersion: keepTemplateSdk ? null : COMPILE_SDK_VERSION,
    targetSdkVersion: keepTemplateSdk ? null : TARGET_SDK_VERSION,
  };
}

/** Compares dotted versions numerically; qualifiers such as "-RC1" are ignored. */
function compareVersions(a, b) {
  const parse = (v) =>
    String(v)
      .split('-')[0]
      .split('.')
      .map((p) => Number(p) || 0);
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/**
 * Pins the Kotlin Gradle plugin classpath in a root android/build.gradle.
 * A KGP version that is already pinned to a literal >= minVersion, or that is
 * already taken from a Groovy variable, is kept.
 *
 * @param {string} content build.gradle content
 * @param {string} versionExpression literal ("2.3.0") or Groovy reference ("${kotlinVersion}")
 * @param {string} minVersion lowest acceptable pinned literal
 */
function pinKotlinGradlePlugin(content, versionExpression, minVersion) {
  if (KGP_PARAMETERIZED.test(content)) {
    return content;
  }
  const match = content.match(KGP_CLASSPATH);
  if (!match) {
    throw new Error(
      KGP_REFERENCE.test(content)
        ? 'kotlin-gradle-plugin classpath has an unsupported format in build.gradle'
        : 'kotlin-gradle-plugin classpath not found in build.gradle'
    );
  }
  const [declaration, quote, pinned] = match;
  if (pinned && compareVersions(pinned, minVersion) >= 0) {
    return content;
  }
  return content.replace(
    declaration,
    () =>
      `classpath(${quote}org.jetbrains.kotlin:kotlin-gradle-plugin:${versionExpression}${quote})`
  );
}

/** Raises compileSdk, targetSdk and build tools in a root build.gradle ext block. */
function raiseAndroidSdkVersions(content) {
  const raiseNumber = (text, pattern, minimum) =>
    text.replace(pattern, (declaration, prefix, value) =>
      Number(value) < minimum ? `${prefix}${minimum}` : declaration
    );
  let patched = raiseNumber(content, COMPILE_SDK_EXT, COMPILE_SDK_VERSION);
  patched = raiseNumber(patched, TARGET_SDK_EXT, TARGET_SDK_VERSION);
  return patched.replace(
    BUILD_TOOLS_EXT,
    (declaration, prefix, quote, value) =>
      compareVersions(value, BUILD_TOOLS_VERSION) < 0
        ? `${prefix}${quote}${BUILD_TOOLS_VERSION}${quote}`
        : declaration
  );
}

/** Bare React Native: raises ext.kotlinVersion and the Android SDK, and makes KGP follow Kotlin. */
function patchReactNativeBuildGradle(content, minVersion = KOTLIN_VERSION) {
  let patched = raiseAndroidSdkVersions(content);
  const ext = patched.match(KOTLIN_VERSION_EXT);
  if (!ext) {
    return pinKotlinGradlePlugin(patched, minVersion, minVersion);
  }
  if (compareVersions(ext[3], minVersion) < 0) {
    patched = patched.replace(KOTLIN_VERSION_EXT, `$1$2${minVersion}$2`);
  }
  return pinKotlinGradlePlugin(patched, '${kotlinVersion}', minVersion);
}

/** Adds or merges the expo-build-properties plugin entry in an Expo config. */
function addExpoBuildProperties(
  expoConfig,
  {
    kotlinVersion = KOTLIN_VERSION,
    compileSdkVersion = COMPILE_SDK_VERSION,
    targetSdkVersion = TARGET_SDK_VERSION,
  } = {}
) {
  const plugins = expoConfig.plugins || (expoConfig.plugins = []);
  const index = plugins.findIndex(
    (plugin) =>
      (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-build-properties'
  );
  const existing =
    index >= 0 && Array.isArray(plugins[index]) ? plugins[index][1] || {} : {};
  const android = { ...existing.android };

  if (
    !android.kotlinVersion ||
    compareVersions(android.kotlinVersion, kotlinVersion) < 0
  ) {
    android.kotlinVersion = kotlinVersion;
  }
  if (
    compileSdkVersion &&
    (!android.compileSdkVersion ||
      android.compileSdkVersion < compileSdkVersion)
  ) {
    android.compileSdkVersion = compileSdkVersion;
  }
  if (
    targetSdkVersion &&
    (!android.targetSdkVersion || android.targetSdkVersion < targetSdkVersion)
  ) {
    android.targetSdkVersion = targetSdkVersion;
  }

  const entry = ['expo-build-properties', { ...existing, android }];
  if (index >= 0) {
    plugins[index] = entry;
  } else {
    plugins.push(entry);
  }
  return expoConfig;
}

function run(platform, projectDir) {
  if (platform !== 'react-native') {
    throw new Error(`Unknown platform "${platform}", use react-native`);
  }
  const gradleFile = path.join(projectDir, 'android', 'build.gradle');
  const content = fs.readFileSync(gradleFile, 'utf8');
  fs.writeFileSync(gradleFile, patchReactNativeBuildGradle(content));
  console.log(
    `✓ Configured Android toolchain for ${platform} in ${gradleFile}`
  );
}

if (require.main === module) {
  try {
    run(process.argv[2], process.argv[3] || '.');
  } catch (error) {
    console.error('Error configuring Android toolchain:', error.message);
    process.exit(1);
  }
}

module.exports = {
  KOTLIN_VERSION,
  COMPILE_SDK_VERSION,
  TARGET_SDK_VERSION,
  BUILD_TOOLS_VERSION,
  compareVersions,
  kotlinVersionForExpo,
  expoBuildPropertiesFor,
  pinKotlinGradlePlugin,
  raiseAndroidSdkVersions,
  patchReactNativeBuildGradle,
  addExpoBuildProperties,
};
