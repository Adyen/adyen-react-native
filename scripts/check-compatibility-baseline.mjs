// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

import { readFileSync } from 'node:fs';

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const compatibility = read('docs/Compatibility.md');
const migrationGuide = read('docs/MigrationGuide.md');
const pullRequestWorkflow = read('.github/workflows/pr_check.yml');

const failures = [];

if (packageJson.peerDependencies['react-native'] !== '>=0.82') {
  failures.push('package.json must declare react-native >=0.82.');
}

if (packageJson.peerDependencies.expo !== '>=56') {
  failures.push('package.json must declare expo >=56.');
}

for (const [name, contents] of [
  ['Compatibility.md', compatibility],
  ['MigrationGuide.md', migrationGuide],
]) {
  if (!contents.includes('TurboModule-only')) {
    failures.push(
      `${name} must document the TurboModule-only runtime requirement.`
    );
  }
}

if (
  !pullRequestWorkflow.includes("version: '0.82.4'") ||
  /version: '0\.(?:[0-7]\d|8[01])\./.test(pullRequestWorkflow)
) {
  failures.push('The active React Native CI matrix must start at 0.82.4.');
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('React Native 0.82 compatibility baseline is established.');
