// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.

export function configureKotlinBuild(contents, buildFile, kotlinVersion) {
  const withCompatibleKotlin = contents.replace(
    /kotlinVersion\s*=\s*["'][^"']+["']/,
    `kotlinVersion = "${kotlinVersion}"`
  );
  if (withCompatibleKotlin === contents) {
    throw new Error(`Unable to set Kotlin ${kotlinVersion} in ${buildFile}.`);
  }
  const pinnedPlugin = withCompatibleKotlin.replace(
    /classpath\(["']org\.jetbrains\.kotlin:kotlin-gradle-plugin["']\)/,
    'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
  );
  if (pinnedPlugin === withCompatibleKotlin) {
    throw new Error(`Unable to pin Kotlin Gradle plugin in ${buildFile}.`);
  }
  return pinnedPlugin;
}
