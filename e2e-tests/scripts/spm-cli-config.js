#!/usr/bin/env node
// Copyright (c) 2026 Adyen N.V.

// Prints the React Native CLI config for React Native's SwiftPM tooling, run
// from the root of a fixture app (pinned as its autolinking config command in
// ios/<App>.xcodeproj/.spm-injected.json). @react-native-community/cli only
// detects an iOS project when ios/ contains a Podfile, so for an SPM-only app
// `project.ios` comes back null and `spm add|update|sync` would fail without it.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = process.cwd();
const iosSourceDir = path.join(appRoot, 'ios');

const cliPackageJson = require.resolve(
  '@react-native-community/cli/package.json',
  { paths: [appRoot] }
);
const cliBin = path.join(
  path.dirname(cliPackageJson),
  require(cliPackageJson).bin['rnc-cli']
);

const result = spawnSync(process.execPath, [cliBin, 'config'], {
  cwd: appRoot,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
  maxBuffer: 64 * 1024 * 1024,
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const config = JSON.parse(result.stdout);
config.project = config.project ?? {};
if (config.project.ios == null) {
  const xcodeProjects = fs.existsSync(iosSourceDir)
    ? fs.readdirSync(iosSourceDir).filter((name) => name.endsWith('.xcodeproj'))
    : [];
  if (xcodeProjects.length !== 1) {
    console.error(
      `Expected exactly one .xcodeproj in ${iosSourceDir}, found ${xcodeProjects.length}`
    );
    process.exit(1);
  }
  config.project.ios = {
    sourceDir: iosSourceDir,
    xcodeProject: { name: xcodeProjects[0], path: '.', isWorkspace: false },
    assets: [],
  };
}

process.stdout.write(JSON.stringify(config));
