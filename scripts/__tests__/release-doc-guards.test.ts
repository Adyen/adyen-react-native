// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

import { execFileSync } from 'node:child_process';
import { describe, expect, it } from '@jest/globals';
import { resolve } from 'node:path';

const guards = resolve(__dirname, '../release-doc-guards.mjs');
const fixtureKotlin = resolve(__dirname, '../configure-fixture-kotlin.mjs');

function invoke<T>(
  module: string,
  exportName: string,
  arguments_: unknown[]
): T {
  const program = [
    `import { ${exportName} } from ${JSON.stringify(module)};`,
    `console.log(JSON.stringify(${exportName}(...${JSON.stringify(arguments_)})));`,
  ].join('\n');
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', program], {
      encoding: 'utf8',
    })
  ) as T;
}

const rootSetup = `Set Kotlin \`2.3.21\` in the consuming Android root project and pin the root Kotlin Gradle plugin to that same value.

\`\`\`groovy
buildscript {
    ext {
        kotlinVersion = "2.3.21"
    }
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
}
\`\`\``;

describe('release documentation guards', () => {
  it('rejects a contradictory unavailable-target sentence despite a correct sentence', () => {
    const markdown = [
      'A known valid target that is unavailable resolves `false` from `isAvailable`.',
      'A known valid target that is unavailable rejects `invalidTarget`.',
    ].join('\n\n');

    expect(
      invoke<string[]>(guards, 'unavailableTargetContradictions', [markdown])
    ).toHaveLength(1);
  });

  it('rejects a contradictory unavailable-target table row', () => {
    const markdown =
      '| Target | Result |\n| --- | --- |\n| Known valid unavailable target | `invalidTarget` |';

    expect(
      invoke<string[]>(guards, 'unavailableTargetContradictions', [markdown])
    ).toHaveLength(1);
  });

  it('allows explicitly negated unavailable-target wording', () => {
    const markdown =
      'A known valid target that is unavailable does not reject `invalidTarget`.';

    expect(
      invoke<string[]>(guards, 'unavailableTargetContradictions', [markdown])
    ).toEqual([]);
  });

  it.each([
    ['passes the documented root setup', rootSetup, 0],
    [
      'rejects a non-prescriptive project description',
      rootSetup.replace('Set Kotlin', 'Kotlin is'),
      1,
    ],
    [
      'rejects a missing root plugin requirement',
      rootSetup.replace('root Kotlin Gradle plugin', 'Kotlin Gradle plugin'),
      1,
    ],
    [
      'rejects a mismatched Kotlin version',
      rootSetup.replace('2.3.21"', '2.2.0"'),
      1,
    ],
    [
      'rejects a plugin pin outside the Kotlin version block',
      rootSetup.replace(
        '        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")',
        ''
      ) +
        '\n\n```groovy\nclasspath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")\n```',
      1,
    ],
  ])('%s', (_name, markdown, expectedFailures) => {
    expect(
      invoke<string[]>(guards, 'kotlinRootSetupFailures', [markdown])
    ).toHaveLength(expectedFailures);
  });

  it('uses the shared Kotlin version while configuring packed fixtures', () => {
    const build = `buildscript {
    ext { kotlinVersion = "1.9.0" }
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
    }
}`;

    const configured = invoke<string>(fixtureKotlin, 'configureKotlinBuild', [
      build,
      'android/build.gradle',
      '2.3.21',
    ]);

    expect(configured).toContain('kotlinVersion = "2.3.21"');
    expect(configured).toContain(
      'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
    );
  });
});
