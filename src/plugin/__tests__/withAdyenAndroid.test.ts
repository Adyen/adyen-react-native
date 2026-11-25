// Copyright (c) 2026 Adyen N.V.

import { beforeEach, describe, expect, it } from '@jest/globals';
import {
  WarningAggregator,
  withGradleProperties,
  withSettingsGradle,
} from '@expo/config-plugins';
import { withAdyenAndroid } from '../withAdyenAndroid';

// The mod helpers run their callback right away, so the test sees what they would write.
jest.mock('@expo/config-plugins', () => ({
  withMainActivity: jest.fn((config) => config),
  withAndroidStyles: jest.fn((config) => config),
  withProjectBuildGradle: jest.fn((config) => config),
  withSettingsGradle: jest.fn((config, modifier) => {
    modifier(config);
    return config;
  }),
  withGradleProperties: jest.fn((config, modifier) => {
    modifier(config);
    return config;
  }),
  WarningAggregator: { addWarningAndroid: jest.fn() },
}));

const settings = (contents: string, language = 'groovy') => ({
  name: 'test-app',
  slug: 'test-app',
  modResults: { language, contents },
});

const SETTINGS =
  "pluginManagement { includeBuild('x') }\nplugins { id('a') }\n";

const run = (
  props: Parameters<typeof withAdyenAndroid>[1],
  contents = SETTINGS,
  language = 'groovy'
) => {
  const config = settings(contents, language);
  withAdyenAndroid(config as never, props);
  return config;
};

describe('withAdyenAndroid R8 pin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pins the default R8 version without options', () => {
    const config = run({});
    expect(withSettingsGradle).toHaveBeenCalledTimes(1);
    expect(config.modResults.contents).toContain(
      'classpath("com.android.tools:r8:9.4.18")'
    );
    expect(WarningAggregator.addWarningAndroid).not.toHaveBeenCalled();
  });

  it('pins the version from r8Version', () => {
    const config = run({ r8Version: '9.5.0' });
    expect(config.modResults.contents).toContain('com.android.tools:r8:9.5.0');
  });

  it('does not touch settings.gradle when r8Version is false', () => {
    const config = run({ r8Version: false });
    expect(withSettingsGradle).not.toHaveBeenCalled();
    expect(config.modResults.contents).toBe(SETTINGS);
  });

  it('warns when settings.gradle is not Groovy', () => {
    const config = run({}, 'rootProject.name = "x"', 'kt');
    expect(config.modResults.contents).toBe('rootProject.name = "x"');
    expect(WarningAggregator.addWarningAndroid).toHaveBeenCalledTimes(1);
  });

  it('warns when settings.gradle cannot be patched', () => {
    run({}, 'pluginManagement {\n  includeBuild("x")\n');
    expect(WarningAggregator.addWarningAndroid).toHaveBeenCalledTimes(1);
  });

  it('does not warn when the app pins R8 itself', () => {
    run(
      {},
      "buildscript { dependencies { classpath('com.android.tools:r8:9.6.0') } }"
    );
    expect(WarningAggregator.addWarningAndroid).not.toHaveBeenCalled();
  });

  it('rejects an invalid r8Version', () => {
    expect(() => run({ r8Version: 'latest' })).toThrow('Invalid R8 version');
  });
});

describe('withAdyenAndroid skipR8Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets adyen.skipR8Check in gradle.properties', () => {
    const config = {
      name: 'test-app',
      slug: 'test-app',
      modResults: [{ type: 'property', key: 'newArchEnabled', value: 'true' }],
    };
    withAdyenAndroid(config as never, { skipR8Check: true });
    expect(config.modResults).toContainEqual({
      type: 'property',
      key: 'adyen.skipR8Check',
      value: 'true',
    });
  });

  it('leaves gradle.properties alone by default', () => {
    run({});
    expect(withGradleProperties).not.toHaveBeenCalled();
  });
});
