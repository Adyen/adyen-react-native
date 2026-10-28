#!/usr/bin/env node
// Copyright (c) 2026 Adyen N.V.

// Builds the SPM-only example app and launches it on an iOS simulator.
// `react-native run-ios` cannot be used: @react-native-community/cli only
// detects an iOS project when ios/ contains a Podfile.
//
// Usage: yarn app ios [--udid <simulator udid>] [extra xcodebuild arguments]
// Without --udid, the first booted simulator is used. Start Metro separately
// with `yarn app start`.

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const iosDir = path.resolve(__dirname, '..', 'ios');
const project = 'AdyenExample.xcodeproj';
const scheme = 'AdyenExample';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
let udid;
const udidIndex = args.indexOf('--udid');
if (udidIndex !== -1) {
  udid = args[udidIndex + 1];
  args.splice(udidIndex, 2);
}

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: iosDir,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    maxBuffer: 64 * 1024 * 1024,
  });
}

if (!udid) {
  const { devices } = JSON.parse(
    run('xcrun', ['simctl', 'list', 'devices', 'booted', '--json'], {
      capture: true,
    })
  );
  const booted = Object.values(devices).flat()[0];
  if (!booted) {
    console.error('No booted simulator found. Boot one or pass --udid <udid>.');
    process.exit(1);
  }
  udid = booted.udid;
} else {
  try {
    run('xcrun', ['simctl', 'boot', udid], { capture: true });
  } catch {
    // Already booted.
  }
}

const xcodebuildArgs = [
  '-project',
  project,
  '-scheme',
  scheme,
  '-configuration',
  'Debug',
  '-destination',
  `platform=iOS Simulator,id=${udid}`,
  ...args,
];

run('xcodebuild', ['build', ...xcodebuildArgs]);

const settings = JSON.parse(
  run('xcodebuild', ['-showBuildSettings', '-json', ...xcodebuildArgs], {
    capture: true,
  })
).find((entry) => entry.target === scheme).buildSettings;
const appPath = path.join(settings.TARGET_BUILD_DIR, settings.WRAPPER_NAME);

run('xcrun', ['simctl', 'install', udid, appPath]);
run('xcrun', ['simctl', 'launch', udid, settings.PRODUCT_BUNDLE_IDENTIFIER]);
