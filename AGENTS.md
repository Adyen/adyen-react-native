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

- **Typecheck**: `yarn typecheck`
- **Lint**: `yarn lint`
- **Build declarations**: `yarn prepare`
- **iOS pods**: `yarn app pod` - run before running tests on iOS
- **JS tests**: `yarn test`
- **Native tests**: `yarn test:android`, `yarn test:ios` (or `yarn test:native` for both).
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

## Git & GitHub

- **Working directory**: At the start of every new session, ask the user whether to work in the current directory or a separate worktree. For parallel feature work, use `git worktree add`.
- **Default branch**: `develop`, not `main`.
- **Branch hygiene**: Start new work from latest `origin/develop` on a dedicated branch.
- **Staging**: **NEVER use `git add -A` or `git add .`** — only stage the specific files relevant to the commit.
- **Lockfiles**: Bootstrap commands regenerates `yarn.lock` and/or `Podfile.lock`. Only commit those files when dependency changes are intended. Ask the user before modifying or restoring either file.
- **Commit message format**: `<type>: <imperative description>` — types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `deprecate`, `remove`. Do **not** add a `Co-authored-by` trailer.
- **Ticket number**: Always ask the user for the ticket number before creating a PR.
- **PR strategy**: Prefer small, focused PRs. If a task involves large changes, suggest splitting into a chain of dependent PRs — each buildable and reviewable on its own.
- **After commit**: Push immediately.
- **PR description**: Include a short summary of what changed and why, the ticket number, and any testing notes.
- **PR review responses**: When addressing review comments, reply to each individual comment with the specific commit hash that fixes it (e.g. "Fixed in commit abc1234 — description of change"). Mark invalid comments as such with an explanation.
- **Comment threads**: Before posting a reply to a PR comment thread, check how many distinct users have commented. If more than one user is in the thread (an ongoing conversation), **ask the user before replying**. Only reply directly if it's a single comment or multiple follow-up comments from the same reviewer.

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

Before considering work complete, run the checks relevant to the changed code:

1. Update tests and run `yarn test` for JS/TS changes.
2. Run `yarn test:android` for Android changes and `yarn test:ios` for iOS
   changes (`yarn test:native` for both). Run `yarn app pod` before iOS tests.
3. Run `yarn lint` and `yarn typecheck` for JS/TS changes.
4. Format changed Swift and Kotlin code with `swiftformat ios` and
   `ktlint android -F`, respectively.
5. Check cross-platform naming and old references in all affected test targets.
6. For public TypeScript API changes, run `yarn prepare` and
   `yarn api-extractor`; review breaking changes with the user and regenerate
   the API report if the change is intentional.

If a native test cannot run because its toolchain or dependencies are
unavailable, report that explicitly. A successful build but does not count as a passing test.

