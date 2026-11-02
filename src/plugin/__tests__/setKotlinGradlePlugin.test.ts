// Copyright (c) 2026 Adyen N.V.

import { describe, expect, test } from '@jest/globals';
import { setKotlinGradlePlugin } from '../setKotlinGradlePlugin';

const PARAMETERIZED_CLASSPATH = [
  "    def kotlinVersion = findProperty('android.kotlinVersion')",
  '    classpath(kotlinVersion ? "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion" : \'org.jetbrains.kotlin:kotlin-gradle-plugin\')',
].join('\n');

const rootBuildGradle = (kotlinClasspath: string) => `buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
${kotlinClasspath}
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
`;

// Root android/build.gradle of the Expo SDK 58 template.
const expo58BuildGradle = rootBuildGradle(PARAMETERIZED_CLASSPATH);

describe('setKotlinGradlePlugin', () => {
  test('parameterizes the single-quoted classpath of Expo SDK 54-57', () => {
    const result = setKotlinGradlePlugin(
      rootBuildGradle(
        "    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')"
      )
    );
    expect(result).toBe(rootBuildGradle(PARAMETERIZED_CLASSPATH));
  });

  test('parameterizes a double-quoted classpath', () => {
    const result = setKotlinGradlePlugin(
      rootBuildGradle(
        '    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")'
      )
    );
    expect(result).toBe(rootBuildGradle(PARAMETERIZED_CLASSPATH));
  });

  test('keeps the indentation of the original line', () => {
    const result = setKotlinGradlePlugin(
      "\tclasspath('org.jetbrains.kotlin:kotlin-gradle-plugin')\n"
    );
    expect(result).toBe(
      "\tdef kotlinVersion = findProperty('android.kotlinVersion')\n" +
        '\tclasspath(kotlinVersion ? "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion" : \'org.jetbrains.kotlin:kotlin-gradle-plugin\')\n'
    );
  });

  test('leaves the Expo SDK 58 template untouched', () => {
    expect(setKotlinGradlePlugin(expo58BuildGradle)).toBe(expo58BuildGradle);
  });

  test('leaves an already versioned classpath untouched', () => {
    const versioned = rootBuildGradle(
      "    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.0')"
    );
    expect(setKotlinGradlePlugin(versioned)).toBe(versioned);
  });

  test('leaves a classpath following a Groovy variable untouched', () => {
    const variable = rootBuildGradle(
      '    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")'
    );
    expect(setKotlinGradlePlugin(variable)).toBe(variable);
  });

  test('is idempotent', () => {
    const once = setKotlinGradlePlugin(
      rootBuildGradle(
        "    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')"
      )
    );
    expect(setKotlinGradlePlugin(once)).toBe(once);
  });

  test('does nothing when the classpath is missing', () => {
    const withoutKotlin = rootBuildGradle('');
    expect(setKotlinGradlePlugin(withoutKotlin)).toBe(withoutKotlin);
    expect(setKotlinGradlePlugin('')).toBe('');
  });
});
