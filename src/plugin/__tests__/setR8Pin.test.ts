// Copyright (c) 2026 Adyen N.V.

import { describe, expect, test } from '@jest/globals';
import { DEFAULT_R8_VERSION, setR8Pin } from '../setR8Pin';

const MARKER = '// @adyen/react-native: R8 pin, see docs/Compatibility.md';

const pinBlock = (version: string) => `${MARKER}
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools:r8:${version}")
    }
}
`;

// settings.gradle of the Expo SDK 54-57 templates.
const expoSettings = `pluginManagement {
  def reactNativeGradlePlugin = new File(
    providers.exec {
      workingDir(rootDir)
      commandLine("node", "--print", "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })")
    }.standardOutput.asText.get().trim()
  ).parentFile.absolutePath
  includeBuild(reactNativeGradlePlugin)
}

plugins {
  id("com.facebook.react.settings")
}

rootProject.name = 'MyApp'
include ':app'
`;

// settings.gradle of a React Native template.
const reactNativeSettings = `pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }
plugins { id("com.facebook.react.settings") }
rootProject.name = 'MyApp'
include ':app'
`;

describe('setR8Pin', () => {
  test('pins the default R8 version', () => {
    expect(DEFAULT_R8_VERSION).toBe('9.4.18');
    expect(setR8Pin(reactNativeSettings)).toContain(
      'classpath("com.android.tools:r8:9.4.18")'
    );
  });

  test('adds the block after a one-line pluginManagement', () => {
    expect(setR8Pin(reactNativeSettings, '9.4.18')).toBe(
      `pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }

${pinBlock('9.4.18')}
plugins { id("com.facebook.react.settings") }
rootProject.name = 'MyApp'
include ':app'
`
    );
  });

  test('adds the block after a multi-line pluginManagement with nested braces and strings', () => {
    const result = setR8Pin(expoSettings, '9.4.18');
    const [before, after] = result.split(MARKER) as [string, string];
    expect(
      before.trimEnd().endsWith('includeBuild(reactNativeGradlePlugin)\n}')
    ).toBe(true);
    expect(after).toBe(
      `\nbuildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools:r8:9.4.18")
    }
}

plugins {
  id("com.facebook.react.settings")
}

rootProject.name = 'MyApp'
include ':app'
`
    );
  });

  test('ignores braces in comments and strings when it looks for the end of pluginManagement', () => {
    const settings = `pluginManagement {
  // a stray } in a comment
  /* and another } here */
  def text = "}"
  def other = '}'
  includeBuild("x")
}
plugins { id("a") }
`;
    const result = setR8Pin(settings, '9.4.18');
    expect(result.indexOf('buildscript {')).toBeGreaterThan(
      result.indexOf('includeBuild("x")\n}')
    );
    expect(result.indexOf('buildscript {')).toBeLessThan(
      result.indexOf('plugins {')
    );
  });

  test('puts the block first when there is no pluginManagement', () => {
    const settings = "rootProject.name = 'MyApp'\ninclude ':app'\n";
    expect(setR8Pin(settings, '9.4.18')).toBe(
      `${pinBlock('9.4.18')}\n${settings}`
    );
  });

  test('adds the classpath to an existing buildscript block', () => {
    const settings = `pluginManagement { includeBuild("x") }
buildscript {
    repositories { google() }
    dependencies {
        classpath("com.example:tool:1.0")
    }
}
plugins { id("a") }
`;
    expect(setR8Pin(settings, '9.4.18'))
      .toBe(`pluginManagement { includeBuild("x") }
buildscript {
    repositories { google() }
    dependencies {
        ${MARKER}
        classpath("com.android.tools:r8:9.4.18")
        classpath("com.example:tool:1.0")
    }
}
plugins { id("a") }
`);
  });

  test('leaves an existing buildscript block without dependencies untouched', () => {
    const settings = `buildscript {\n    repositories { google() }\n}\nplugins { id("a") }\n`;
    expect(setR8Pin(settings, '9.4.18')).toBe(settings);
  });

  test('never changes an R8 version the app pins itself', () => {
    const own = `pluginManagement { includeBuild("x") }
buildscript {
    dependencies {
        classpath('com.android.tools:r8:9.5.1')
    }
}
`;
    expect(setR8Pin(own, '9.4.18')).toBe(own);
  });

  test('is idempotent', () => {
    const once = setR8Pin(expoSettings, '9.4.18');
    expect(setR8Pin(once, '9.4.18')).toBe(once);
    const buildscript = `buildscript {\n    dependencies {\n    }\n}\n`;
    const pinned = setR8Pin(buildscript, '9.4.18');
    expect(setR8Pin(pinned, '9.4.18')).toBe(pinned);
  });

  test('updates the version of its own earlier pin', () => {
    const once = setR8Pin(reactNativeSettings, '9.4.18');
    expect(setR8Pin(once, '9.5.0')).toBe(
      setR8Pin(reactNativeSettings, '9.5.0')
    );
  });

  test('leaves the contents unchanged when pluginManagement is not closed', () => {
    const broken = 'pluginManagement {\n  includeBuild("x")\n';
    expect(setR8Pin(broken, '9.4.18')).toBe(broken);
  });

  test.each(['9.4', 'latest', '9.4.18"); evil("', '', '9.4.18-alpha01'])(
    'rejects the version "%s"',
    (version) => {
      expect(() => setR8Pin(reactNativeSettings, version)).toThrow(
        'Invalid R8 version'
      );
    }
  );
});
