// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

import { readFileSync } from 'node:fs';

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const packageJson = JSON.parse(read('example/package.json'));
const podCommand = read('scripts/run-example-pod-update.sh');
const failures = [];

if (packageJson.scripts.pod !== 'bash ../scripts/run-example-pod-update.sh') {
  failures.push(
    'example pod script must invoke the repository-owned pod update wrapper.'
  );
}

for (const requiredFragment of [
  'export DEVELOPER_DIR=/Applications/Xcode_27.2_beta.app/Contents/Developer',
  'export BUNDLE_GEMFILE="$ROOT/Gemfile"',
  'bash "$ROOT/scripts/ensure-xcframeworks.sh"',
  'cd "$ROOT/example/ios"',
  '/usr/local/adyen/bin/ruby',
  '"$HOME/.gem/ruby/3.2.0/bin/bundle"',
  'exec pod update',
]) {
  if (!podCommand.includes(requiredFragment)) {
    failures.push(`pod wrapper must contain: ${requiredFragment}`);
  }
}

if (/(?:^|[;&\s])bundle exec pod/m.test(podCommand)) {
  failures.push('pod wrapper must not invoke bare bundle exec pod.');
}

if (failures.length > 0) {
  throw new Error(failures.join('\n'));
}

console.log('Example pod command uses the repository Ruby/Bundler toolchain.');
