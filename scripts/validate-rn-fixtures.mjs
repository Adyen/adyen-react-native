// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8')
);
const requested = process.argv.filter(
  (argument) => argument === 'minimum' || argument === 'current'
);
const targets = requested.length > 0 ? requested : ['minimum', 'current'];
const versions = {
  minimum: '0.82.4',
  current: packageJson.devDependencies['react-native'],
};

if (!/^0\.82\.\d+$/.test(versions.minimum)) {
  throw new Error(
    `Minimum fixture must resolve to React Native 0.82.x, got ${versions.minimum}.`
  );
}
if (!/^\d+\.\d+\.\d+$/.test(versions.current)) {
  throw new Error(
    `Current fixture must derive an exact version from package.json, got ${versions.current}.`
  );
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}.`);
  }
}

function configureKotlinForAdyen(fixture) {
  const buildFile = join(fixture, 'android/build.gradle');
  const contents = readFileSync(buildFile, 'utf8');
  const withCompatibleKotlin = contents.replace(
    /kotlinVersion\s*=\s*["'][^"']+["']/,
    'kotlinVersion = "2.3.21"'
  );
  if (withCompatibleKotlin === contents) {
    throw new Error(`Unable to set Kotlin 2.3.21 in ${buildFile}.`);
  }
  const pinnedPlugin = withCompatibleKotlin.replace(
    /classpath\(["']org\.jetbrains\.kotlin:kotlin-gradle-plugin["']\)/,
    'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
  );
  if (pinnedPlugin === withCompatibleKotlin) {
    throw new Error(`Unable to pin Kotlin Gradle plugin in ${buildFile}.`);
  }
  writeFileSync(buildFile, pinnedPlugin);
}

function configureIosMinimumForAdyen(fixture) {
  const podfile = join(fixture, 'ios/Podfile');
  const podfileContents = readFileSync(podfile, 'utf8');
  const configuredPodfile = podfileContents.replace(
    /^platform :ios, .+$/m,
    "platform :ios, '16.0'"
  );
  if (configuredPodfile === podfileContents) {
    throw new Error(`Unable to set iOS 16.0 in ${podfile}.`);
  }
  const postInstallEnd = configuredPodfile.lastIndexOf('\n  end\nend\n');
  if (postInstallEnd === -1) {
    throw new Error(`Unable to add fmt workaround in ${podfile}.`);
  }
  const fmtWorkaround = [
    configuredPodfile.slice(0, postInstallEnd),
    "  # RN 0.82's fmt needs this Xcode 26.4+ fixture-only compiler workaround.",
    "  installer.pods_project.targets.select { |target| target.name == 'fmt' }.each do |target|",
    '    target.build_configurations.each do |config|',
    "      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']",
    "      config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_CONSTEVAL=0'",
    "      config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'",
    '    end',
    '  end',
    configuredPodfile.slice(postInstallEnd),
  ].join('\n');
  writeFileSync(podfile, fmtWorkaround);

  const project = join(fixture, 'ios/PackedConsumer.xcodeproj/project.pbxproj');
  const projectContents = readFileSync(project, 'utf8');
  writeFileSync(
    project,
    projectContents.replace(
      /IPHONEOS_DEPLOYMENT_TARGET = [^;]+;/g,
      'IPHONEOS_DEPLOYMENT_TARGET = 16.0;'
    )
  );
}

const fixtureRoot = mkdtempSync(join(tmpdir(), 'adyen-rn-fixtures-'));
let packedLibrary;
try {
  run('yarn', ['prepare'], root);
  const tarball = execFileSync('npm', ['pack', '--json'], {
    cwd: root,
    encoding: 'utf8',
  });
  const [{ filename, integrity, files }] = JSON.parse(tarball);
  const packedPaths = files.map(({ path }) => path);
  const requiredPackedPaths = [
    'lib/commonjs/index.js',
    'lib/module/index.js',
    'lib/typescript/src/index.d.ts',
    'adyen-react-native.podspec',
    'android/build.gradle',
  ];
  const missingPackedPaths = requiredPackedPaths.filter(
    (path) => !packedPaths.includes(path)
  );
  if (missingPackedPaths.length > 0) {
    throw new Error(
      `Packed library is missing required runtime files: ${missingPackedPaths.join(', ')}.`
    );
  }
  const forbiddenPackedPaths = packedPaths.filter((path) =>
    /(?:^|\/)(?:secrets?|credentials?)(?:\.|\/|$)|(?:^|\/)\.env(?:\.|$)/i.test(
      path
    )
  );
  if (forbiddenPackedPaths.length > 0) {
    throw new Error(
      `Packed library contains forbidden credential files: ${forbiddenPackedPaths.join(', ')}.`
    );
  }
  packedLibrary = resolve(root, filename);
  console.log(`Packed library: ${filename} (${integrity}).`);

  for (const target of targets) {
    const version = versions[target];
    const fixture = join(fixtureRoot, `rn-${version}`);
    const cli = execFileSync(
      'bash',
      [join(root, 'e2e-tests/scripts/resolve_rn_cli_version.sh'), version],
      { cwd: root, encoding: 'utf8' }
    ).trim();
    run(
      'npx',
      [
        `@react-native-community/cli@${cli}`,
        'init',
        'PackedConsumer',
        '--directory',
        fixture,
        '--version',
        version,
        '--install-pods',
        'false',
        '--skip-install',
      ],
      root
    );
    writeFileSync(
      join(fixture, 'App.tsx'),
      [
        "import React from 'react';",
        "import { View } from 'react-native';",
        'export default function App(): React.JSX.Element {',
        '  return <View>{/* Package autolinking and Codegen are the fixture contract. */}</View>;',
        '}',
        '',
      ].join('\n')
    );
    const properties = join(fixture, 'android/gradle.properties');
    writeFileSync(
      properties,
      `${readFileSync(properties, 'utf8').replace(/^newArchEnabled=.*/m, 'newArchEnabled=true')}\n`
    );
    writeFileSync(join(fixture, '.yarnrc.yml'), 'nodeLinker: node-modules\n');
    run('yarn', ['install'], fixture);
    run('yarn', ['add', `@adyen/react-native@file:${packedLibrary}`], fixture);
    configureKotlinForAdyen(fixture);
    configureIosMinimumForAdyen(fixture);
    run(
      './gradlew',
      [':app:generateCodegenArtifactsFromSchema', ':app:assembleDebug'],
      join(fixture, 'android')
    );
    const iosDirectory = join(fixture, 'ios');
    run('bundle', ['install'], iosDirectory);
    run('bundle', ['exec', 'pod', 'install'], iosDirectory);
    run(
      'xcodebuild',
      [
        '-workspace',
        'PackedConsumer.xcworkspace',
        '-scheme',
        'PackedConsumer',
        '-sdk',
        'iphonesimulator',
        '-configuration',
        'Debug',
        '-destination',
        'generic/platform=iOS Simulator',
        'build',
      ],
      iosDirectory
    );
    console.log(`Packed fixture passed: RN ${version} (${target}).`);
  }
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
  if (packedLibrary) rmSync(packedLibrary, { force: true });
}
