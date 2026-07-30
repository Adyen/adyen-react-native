---
name: react-native-update-android-sdk
description: Bumps this React Native plugin's underlying native Android dependency to its latest released version.
user-invocable: true
---

# React Native: Update Android Dependency

Use this skill to bump the native Android dependency consumed by this React Native plugin to its
latest released version.

All paths below are relative to the repository root.

- **Upstream repository**: https://github.com/Adyen/adyen-android
- **Latest release**: https://github.com/Adyen/adyen-android/releases/latest
- **Dependency declaration**: `android/dependencies.gradle`, `adyen_version = "X.X.X"`
- **Base branch**: `develop` (not `main`)

## Steps

1. Check the latest release tag at https://github.com/Adyen/adyen-android/releases/latest.

2. Compare with the version currently pinned in the dependency declaration file above.
   - If already on the latest version, stop here and report that no update is needed. Otherwise continue.

3. Create a branch from `develop` named `feature/UpdateReactNativeAndroidSdkToVX.X.X` (substitute the
   target version).

4. Update `adyen_version` in `android/dependencies.gradle` to the latest version.

5. Update the Android badge in `README.md` to reference the new version and its release tag URL.

6. Verify the bump builds:
   - Run `yarn install` at the repository root.
   - Run `./gradlew assembleDebug` from `example/android/` to confirm the plugin still compiles
     against the new Android dependency.
   - If the build fails, investigate whether it's due to a breaking change in the new dependency
     version before continuing.

7. Commit and push:
   - Only stage the files changed by this skill — do not use `git add -A` or `git add .`.
   - Commit with the format `chore: update Android SDK to vX.X.X` (no `Co-authored-by` trailer).
   - Push the branch immediately after committing.

8. Before opening a PR, ask the user for the ticket number to include in the PR description.
   Open the PR against `develop` in `Adyen/adyen-react-native` with `gh pr create`, summarizing the
   version bump, the ticket number, and linking the upstream release notes.

## Sanity checks

- Ensure no unrelated files are modified.
- Check the upstream release notes for breaking changes that could affect the React Native plugin.
- If the Gradle build fails or dependency resolution errors occur, try invalidating the Gradle
  cache (`cd example/android && ./gradlew clean`) before re-running the build.
