// Copyright (c) 2026 Adyen N.V.

// Tests for e2e-tests/scripts/configure-android-toolchain.js. They live here
// because Jest ignores the e2e-tests directory (testPathIgnorePatterns).

import { describe, expect, it } from '@jest/globals';
import { spawnSync } from 'child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const SCRIPT = resolve(
  __dirname,
  '../../e2e-tests/scripts/configure-android-toolchain.js'
);

const toolchain = require(SCRIPT);

const rnGradle = (
  kotlin: string,
  classpath = 'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")',
  { compileSdk = 36, targetSdk = 36, buildTools = '36.0.0' } = {}
) => `buildscript {
    ext {
        buildToolsVersion = "${buildTools}"
        compileSdkVersion = ${compileSdk}
        targetSdkVersion = ${targetSdk}
        kotlinVersion = "${kotlin}"
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        ${classpath}
    }
}
`;

const gradleWithoutKotlinExt = (
  classpath = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')"
) => `buildscript {
  dependencies {
    classpath('com.android.tools.build:gradle')
    ${classpath}
  }
}
`;

describe('compareVersions', () => {
  it('compares numerically', () => {
    expect(toolchain.compareVersions('2.3.0', '2.1.20')).toBeGreaterThan(0);
    expect(toolchain.compareVersions('2.1.20', '2.3.0')).toBeLessThan(0);
    expect(toolchain.compareVersions('2.3', '2.3.0')).toBe(0);
    expect(toolchain.compareVersions('2.3.21', '2.3.0')).toBeGreaterThan(0);
    expect(toolchain.compareVersions('2.4.0-RC1', '2.3.0')).toBeGreaterThan(0);
  });
});

describe('kotlinVersionForExpo', () => {
  it('uses 2.2.20 for Expo SDK 54', () => {
    expect(toolchain.kotlinVersionForExpo('~54.0.36')).toBe('2.2.20');
  });

  it('uses 2.3.0 for other SDKs', () => {
    expect(toolchain.kotlinVersionForExpo('~55.0.31')).toBe('2.3.0');
    expect(toolchain.kotlinVersionForExpo('^57.0.0')).toBe('2.3.0');
    expect(toolchain.kotlinVersionForExpo(undefined)).toBe('2.3.0');
  });
});

describe('expoBuildPropertiesFor', () => {
  it('sets Kotlin and the Android SDK for Expo SDK 54 to 57', () => {
    expect(toolchain.expoBuildPropertiesFor('~54.0.36')).toEqual({
      kotlinVersion: '2.2.20',
      compileSdkVersion: 36,
      targetSdkVersion: 36,
    });
    expect(toolchain.expoBuildPropertiesFor('~57.0.2')).toEqual({
      kotlinVersion: '2.3.0',
      compileSdkVersion: 36,
      targetSdkVersion: 36,
    });
  });

  it('keeps the template Android SDK from Expo SDK 58', () => {
    expect(toolchain.expoBuildPropertiesFor('~58.0.7')).toEqual({
      kotlinVersion: '2.3.0',
      compileSdkVersion: null,
      targetSdkVersion: null,
    });
  });
});

describe('patchReactNativeBuildGradle', () => {
  it('raises an older Kotlin version and pins the plugin to it', () => {
    const result = toolchain.patchReactNativeBuildGradle(rnGradle('2.1.20'));
    expect(result).toContain('kotlinVersion = "2.3.0"');
    expect(result).toContain(
      'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")'
    );
  });

  it('keeps a newer Kotlin version', () => {
    const result = toolchain.patchReactNativeBuildGradle(rnGradle('2.3.21'));
    expect(result).toContain('kotlinVersion = "2.3.21"');
    expect(result).toContain('kotlin-gradle-plugin:${kotlinVersion}');
  });

  it('is idempotent', () => {
    const once = toolchain.patchReactNativeBuildGradle(rnGradle('2.1.20'));
    expect(toolchain.patchReactNativeBuildGradle(once)).toBe(once);
  });

  it('raises the Android SDK versions to 36', () => {
    const result = toolchain.patchReactNativeBuildGradle(
      rnGradle('2.1.20', undefined, {
        compileSdk: 35,
        targetSdk: 35,
        buildTools: '35.0.0',
      })
    );
    expect(result).toContain('compileSdkVersion = 36');
    expect(result).toContain('targetSdkVersion = 36');
    expect(result).toContain('buildToolsVersion = "36.0.0"');
  });

  it('keeps newer Android SDK versions', () => {
    const gradle = rnGradle('2.3.0', undefined, {
      compileSdk: 37,
      targetSdk: 36,
      buildTools: '37.0.0',
    });
    const result = toolchain.patchReactNativeBuildGradle(gradle);
    expect(result).toContain('compileSdkVersion = 37');
    expect(result).toContain('targetSdkVersion = 36');
    expect(result).toContain('buildToolsVersion = "37.0.0"');
  });

  it('is idempotent for an older Android SDK', () => {
    const once = toolchain.patchReactNativeBuildGradle(
      rnGradle('2.1.20', undefined, {
        compileSdk: 35,
        targetSdk: 35,
        buildTools: '35.0.0',
      })
    );
    expect(toolchain.patchReactNativeBuildGradle(once)).toBe(once);
  });

  it('pins a literal version when kotlinVersion is not declared', () => {
    const result = toolchain.patchReactNativeBuildGradle(
      gradleWithoutKotlinExt()
    );
    expect(result).toContain("kotlin-gradle-plugin:2.3.0')");
  });

  it('replaces a plugin pinned to an older version', () => {
    const result = toolchain.patchReactNativeBuildGradle(
      gradleWithoutKotlinExt(
        "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.20')"
      )
    );
    expect(result).toContain("kotlin-gradle-plugin:2.3.0')");
  });

  it('keeps a plugin already pinned to a newer version', () => {
    const gradle = gradleWithoutKotlinExt(
      "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.10')"
    );
    expect(toolchain.patchReactNativeBuildGradle(gradle)).toBe(gradle);
  });

  it('fails when the plugin classpath is missing', () => {
    expect(() =>
      toolchain.patchReactNativeBuildGradle('buildscript {}')
    ).toThrow('kotlin-gradle-plugin classpath not found');
  });
});

describe('addExpoBuildProperties', () => {
  it('adds the plugin with Kotlin, compileSdk and targetSdk', () => {
    const config = toolchain.addExpoBuildProperties({
      plugins: ['@adyen/react-native'],
    });
    expect(config.plugins).toEqual([
      '@adyen/react-native',
      [
        'expo-build-properties',
        {
          android: {
            kotlinVersion: '2.3.0',
            compileSdkVersion: 36,
            targetSdkVersion: 36,
          },
        },
      ],
    ]);
  });

  it('raises an older targetSdk and keeps a newer compileSdk', () => {
    const config = toolchain.addExpoBuildProperties({
      plugins: [
        [
          'expo-build-properties',
          { android: { compileSdkVersion: 37, targetSdkVersion: 35 } },
        ],
      ],
    });
    expect(config.plugins[0][1].android).toMatchObject({
      compileSdkVersion: 37,
      targetSdkVersion: 36,
    });
  });

  it('leaves the Android SDK to the template when not requested', () => {
    const config = toolchain.addExpoBuildProperties(
      {},
      toolchain.expoBuildPropertiesFor('~58.0.7')
    );
    expect(config.plugins).toEqual([
      ['expo-build-properties', { android: { kotlinVersion: '2.3.0' } }],
    ]);
  });

  it('creates the plugins list when missing', () => {
    const config = toolchain.addExpoBuildProperties({});
    expect(config.plugins).toHaveLength(1);
  });

  it('merges into an existing entry and keeps newer values', () => {
    const config = toolchain.addExpoBuildProperties({
      plugins: [
        [
          'expo-build-properties',
          {
            android: { kotlinVersion: '2.3.10', minSdkVersion: 26 },
            ios: { deploymentTarget: '16.0' },
          },
        ],
      ],
    });
    expect(config.plugins).toEqual([
      [
        'expo-build-properties',
        {
          android: {
            kotlinVersion: '2.3.10',
            minSdkVersion: 26,
            compileSdkVersion: 36,
            targetSdkVersion: 36,
          },
          ios: { deploymentTarget: '16.0' },
        },
      ],
    ]);
  });
});

describe('CLI', () => {
  const runCli = (args: string[], dir: string) =>
    spawnSync('node', [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });

  const withProject = (fn: (dir: string) => void) => {
    const dir = mkdtempSync(join(tmpdir(), 'android-toolchain-'));
    mkdirSync(join(dir, 'android'));
    try {
      fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it('patches a react-native project in place', () => {
    withProject((dir) => {
      writeFileSync(join(dir, 'android/build.gradle'), rnGradle('2.1.20'));
      const result = runCli(['react-native', dir], dir);
      expect(result.status).toBe(0);
      expect(readFileSync(join(dir, 'android/build.gradle'), 'utf8')).toContain(
        'kotlinVersion = "2.3.0"'
      );
    });
  });

  it('rejects other platforms', () => {
    withProject((dir) => {
      writeFileSync(
        join(dir, 'android/build.gradle'),
        gradleWithoutKotlinExt()
      );
      expect(runCli(['expo', dir], dir).status).toBe(1);
      expect(runCli(['flutter', dir], dir).status).toBe(1);
    });
  });
});
