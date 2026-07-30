---
name: react-native-update-ios-sdk
description: Bumps this React Native plugin's underlying native iOS dependency to its latest released version.
user-invocable: true
---

# React Native: Update iOS Dependency

Use this skill to bump the native iOS dependency consumed by this React Native plugin to its
latest released version.

All paths below are relative to the repository root.

- **Upstream repository**: https://github.com/Adyen/adyen-ios
- **Latest release**: https://github.com/Adyen/adyen-ios/releases/latest
- **CocoaPods declaration**: `adyen-react-native.podspec`, `s.dependency "Adyen", 'X.X.X'`
- **Base branch**: `develop` (not `main`)

## Steps

1. Check the latest release version at https://github.com/Adyen/adyen-ios/releases/latest.

2. Compare with the version currently pinned in the CocoaPods declaration file above.
   - If already on the latest version, stop here and report that no update is needed. Otherwise continue.

3. Create a branch from `develop` named `feature/UpdateReactNativeIosSdkToVX.X.X` (substitute the
   target version).

4. Update the CocoaPods dependency declaration in `adyen-react-native.podspec` to the latest version.

5. Update the iOS badge in `README.md` to reference the new version and its release tag URL.

6. Verify the bump builds:
   - Run `yarn install` at the repository root.
   - Run `pod install --repo-update` from `example/ios/` to resolve the new CocoaPods dependency.
   - Build the example app, e.g. `xcodebuild build -workspace example/ios/AdyenExample.xcworkspace
     -scheme AdyenExample -destination 'generic/platform=iOS Simulator'`, to confirm the plugin still
     compiles against the new iOS dependency.
   - If the build fails, investigate whether it's due to a breaking change in the new dependency
     version before continuing.

7. Commit and push:
   - Only stage the files changed by this skill — do not use `git add -A` or `git add .`.
   - Commit with the format `chore: update iOS SDK to vX.X.X` (no `Co-authored-by` trailer).
   - Push the branch immediately after committing.

8. Before opening a PR, ask the user for the ticket number to include in the PR description.
   Open the PR against `develop` in `Adyen/adyen-react-native` with `gh pr create`, summarizing the
   version bump, the ticket number, and linking the upstream release notes.

## Sanity checks

- Ensure no unrelated files are modified.
- If `pod install` fails, try `pod repo update` first.
- Check the [Adyen iOS migration guide](https://docs.adyen.com/online-payments/build-your-integration/?platform=iOS&integration=Drop-in#migration-guide) for any breaking changes.
- Verify minimum iOS version requirements have not changed.
