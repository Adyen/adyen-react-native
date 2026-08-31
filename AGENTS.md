# Agents Guide

## Repository Structure

This is a React Native SDK with three platform targets:
- **JS/TS**: `src/` — TypeScript source, components, hooks, modules
- **Expo plugin**: `src/plugin/` — Expo config plugin (modifies native projects during `expo prebuild`)
- **Codegen specs**: `src/specs/` — React Native codegen specs (native module interfaces)
- **iOS**: `ios/` — iOS-specific source (Swift, Objective-C)
- **Android**: `android/src/main/java/com/adyenreactnativesdk/` — Android-specific source (Kotlin)
- **Example app**: `example/` — includes iOS/Android test targets

## Build & Test Commands

> **Before anything else in a fresh clone, run `npm start`.** This bootstraps the project and installs Husky git hooks (linters + JS tests run on every commit). Skipping this will cause commit hooks to fail. If packages fail to resolve, do not attempt to override the registry (e.g. do not add `--registry https://registry.npmjs.org`). Inform the user instead — the environment may use a private registry.

- **JS tests**: `yarn test`
- **Typecheck**: `yarn typecheck`
- **Lint**: `yarn lint`
- **Build declarations**: `yarn prepare`
- **Check the committed Public API snapshot**: `yarn api-extractor`
- **Update the Public API snapshot intentionally**: `yarn api-extractor:update`
- **iOS build**: CI runs via Xcode (see `.github/workflows/`)
- **Android build**: CI runs via Gradle (see `.github/workflows/`)
- **If `swiftformat` and `ktlint`** are not installed, inform the user.

### Android Build

The `android/` module has no standalone Gradle wrapper. All Android compilation must go through the example app:

```bash
# Bridge module only
cd example/android && ./gradlew :adyen_react-native:compileDebugKotlin

# Full example APK
cd example/android && ./gradlew assembleDebug
```

**Kotlin version**: The Adyen Android SDK v6 artifacts require a compatible Kotlin compiler. If you see `Module was compiled with an incompatible version of Kotlin. The binary version of its metadata is X.X.X, expected version is Y.Y.Y`, bump `kotlinVersion` in `example/android/build.gradle` AND pin the root buildscript classpath:
```groovy
dependencies {
    classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"
}
```
Simply setting `ext.kotlinVersion` is insufficient if the root classpath is unpinned.

## Git & GitHub

- **Working directory**: At the start of every new session, ask the user whether to work in the current directory or a separate worktree. For parallel feature work, use `git worktree add`.
- **Default branch**: `develop`, not `main`.
- **Branch hygiene**: Start new work from latest `origin/develop` on a dedicated branch.
- **Staging**: **NEVER use `git add -A` or `git add .`** — only stage the specific files relevant to the commit.
- **Lockfiles**: Leave `yarn.lock` and `example/ios/Podfile.lock` out of commits unless a dependency change is the point of the task. `npm start` deletes and regenerates `yarn.lock`, and `yarn app pod` rewrites `Podfile.lock`, so both routinely show as modified after bootstrapping. Do **not** restore them to the committed version either - ask the user before touching either file.
- **Commit message format**: `<type>: <imperative description>` — types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `deprecate`, `remove`. Do **not** add a `Co-authored-by` trailer.
- **Ticket number**: Always ask the user for the ticket number before creating a PR.
- **PR strategy**: Prefer small, focused PRs. If a task involves large changes, suggest splitting into a chain of dependent PRs — each buildable and reviewable on its own.
- **After commit**: Push immediately.
- **PR description**: Include a short summary of what changed and why, the ticket number, and any testing notes.
- **PR review responses**: When addressing review comments, reply to each individual comment with the specific commit hash that fixes it (e.g. "Fixed in commit abc1234 — description of change"). Mark invalid comments as such with an explanation.
- **Comment threads**: Before posting a reply to a PR comment thread, check how many distinct users have commented. If more than one user is in the thread (an ongoing conversation), **ask the user before replying**. Only reply directly if it's a single comment or multiple follow-up comments from the same reviewer.
- **Worktree verification**: When working in a git worktree, always verify you are in the correct worktree before making edits or commits. Run `git rev-parse --show-toplevel` and confirm it matches the intended path. Never assume `cd` landed you in the right repo when multiple checkouts of the same repository exist (e.g., `sdks/adyen-react-native` vs `sdks/adyen-react-native-v6-alpha`).

## Refactoring Conventions

- **Before adding or refactoring native modules, events, or class hierarchies**, review `docs/Architecture.md` to understand the existing structure and patterns.
- **Cross-platform consistency**: Check for mismatched class names, error codes, and enum values across all three platforms.
- **Before renaming symbols with `sed`**, verify there are no unintended substring matches — e.g. `s/Event/PaymentEvent/g` will correctly rename `EventName` but also corrupt `coreEvent` into `corePaymentEvent`. Use whole-word matching or targeted per-symbol replacements.
- **After moving a file to a new package/directory**, update the `package` declaration (Kotlin) and update imports in every consumer (Kotlin and JS/TS).
- **When renaming a class, also rename local variables** that reference the old name (e.g. `submitMap` → `submitData` when `SubmitMap` → `SubmitData`).
- **Always update tests**: After any rename or restructure, grep for old references in all test targets, not just the main source. Test locations:
  - **JS**: `src/**/__tests__/`
  - **iOS**: `example/ios/AdyenExampleTests/`
  - **Android**: `android/src/test/java/com/adyenreactnativesdk/`

## Migration & Refactoring

### Feature description accuracy
Feature descriptions should reference correct file paths. Before implementing, verify that referenced files actually exist in the codebase. If a feature description references a non-existent file, note the discrepancy in the handoff rather than silently skipping.

## Public API snapshots

The public TypeScript API is tracked in `etc/api/adyen-react-native.api.md`.

When changing exported TypeScript types, components, hooks, or modules:

1. Run `yarn prepare` to generate TypeScript declarations.
2. Run `yarn api-extractor` to validate the committed API snapshot.
3. If the API change is intentional, run `yarn api-extractor:update`.
4. Review and include the API report diff with the change.

Do not manually edit `etc/api/adyen-react-native.api.md`; it is generated by API Extractor. The `public_api_check.yml` workflow compares the regenerated report with the target branch and reports differences in the pull request.

## Code Style

### TypeScript / JavaScript
- Declare constants above the functions that use them.
- Run `yarn lint` after editing.
- **Never add new npm packages** without first checking with the user and providing a list of compelling arguments why the dependency is necessary.

### Swift (iOS)
- Run `swiftformat ios` after editing.

### Kotlin (Android)
- Run `ktlint android -F` after editing.

### All platforms
- Match naming conventions of each platform (Swift, Kotlin, TypeScript).
- **Copyright headers**: New files must include the Adyen copyright header. Use the current year. Match the format from existing files in the same directory.
- **Never manually edit generated files** — edit the source/template and re-run generation.
- **When in doubt**: Search for similar patterns in the existing codebase before implementing. Ask questions rather than making assumptions.

## Verification Checklist

Before considering work complete:
1. Tests written/updated and passing (`yarn test`)
2. All checks pass (`yarn lint`, `yarn typecheck`)
3. Swift files formatted (`swiftformat ios`)
4. Kotlin files formatted (`ktlint android -F`)
5. Cross-platform naming verified (JS, iOS, Android aligned)
6. Old references updated in all three test targets
7. Public API snapshot validated (`yarn prepare`, `yarn api-extractor`)
8. If public API changed: reviewed for breaking changes and discussed with user
9. If the public API changed intentionally, the API report was regenerated and reviewed

**Native-only changes**: When a feature modifies only Swift or Kotlin files (zero TypeScript changes), steps 1-2 add no signal. If `npm start` hangs on yarn resolution, these JS checks can be skipped. Native correctness is verified via `xcodebuild` (iOS) or `./gradlew :adyen_react-native:compileDebugKotlin` (Android) when the full dependency chain is available.

