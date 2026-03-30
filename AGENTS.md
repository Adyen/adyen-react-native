# Agents Guide

## Repository Structure

This is a React Native SDK with three platform targets:
- **JS/TS**: `src/` — TypeScript source, components, hooks, modules
- **iOS**: `ios/` — iOS-specific source (Swift, Objective-C)
- **Android**: `android/src/main/java/com/adyenreactnativesdk/` — Android-specific source (Kotlin)
- **Example app**: `example/` — includes iOS/Android test targets

## Build & Test Commands

> **Before anything else in a fresh clone, run `npm start`.** This bootstraps the project and installs Husky git hooks (linters + JS tests run on every commit). Skipping this will cause commit hooks to fail. If packages fail to resolve, do not attempt to override the registry (e.g. do not add `--registry https://registry.npmjs.org`). Inform the user instead — the environment may use a private registry.

- **JS tests**: `yarn test`
- **Typecheck**: `yarn typecheck`
- **Lint**: `yarn lint`
- **iOS build**: CI runs via Xcode (see `.github/workflows/`)
- **Android build**: CI runs via Gradle (see `.github/workflows/`)
- **`swiftformat` and `ktlint`** must be installed separately (not in repo dev dependencies). If `brew` is available, install via `brew install swiftformat` and `brew install ktlint`. If `brew` is unavailable or restricted, skip installation and inform the user — do not attempt alternative installation methods.

## Git & GitHub

- **Remote operations**: Use `gh` CLI for all GitHub operations.
- **Working directory**: At the start of every new session, ask the user whether to work in the current directory or a separate worktree. For parallel feature work, use `git worktree add`.
- **Default branch**: `develop`, not `main`.
- **Branch hygiene**: Start new work from latest `origin/develop` on a dedicated branch.
- **Commits**: Do not add `Co-authored-by` trailers to commits. **NEVER use `git add -A` or `git add .`** — only stage the specific files relevant to the commit.
- **Commit message format**:
  ```
  [purpose]: [Imperative-mood description]
  ```
  Purpose prefixes: `feat` (public API addition), `fix` (bug fix), `chore` (tooling changes), `refactor`, `test`, `docs`, `deprecate`, `remove`.
  Examples: `chore: Update CI config`, `feat: Add xyz method`, `fix: Resolve race condition`
- **Ticket number**: Always ask the user for the ticket number before making a commit. Use the same number for all commits in a task.
- **After commit**: Push immediately.
- **PR review responses**: When addressing review comments, reply to each individual comment with the specific commit hash that fixes it (e.g. "Fixed in commit abc1234 — description of change"). Mark invalid comments as such with an explanation.

## Refactoring Conventions

- **Never use blanket `sed` for symbol renames** across Swift/Kotlin files. Property names like `coreEvents` contain substrings of other symbols — a pattern like `s/Events\./EventName./g` will corrupt `coreEvents` into `coreEventName`. Use whole-word matching or targeted per-symbol replacements.
- **After moving a file to a new package/directory**, always grep for all public symbols it exports and update imports in every consumer.
- **When renaming a class, also rename local variables** that reference the old name (e.g. `submitMap` → `submitData` when `SubmitMap` → `SubmitData`).
- **Cross-platform consistency**: When modifying iOS, Android, or JS, verify naming and logic are aligned across all three platforms. Check for mismatched class names, error codes, and enum values.
- **Always update tests**: After any rename or restructure, grep for old references in all test targets, not just the main source. Test locations:
  - **JS**: `src/**/__tests__/`
  - **iOS**: `example/ios/AdyenExampleTests/`
  - **Android**: `android/src/test/java/com/adyenreactnativesdk/`

## Code Style

- **Always run `swiftformat ios`** after editing any Swift files to avoid formatting noise in diffs.
- **Always run `ktlint android -F`** after editing any Kotlin files.
- In TypeScript, declare constants above the functions that use them.
- Follow existing patterns and libraries already used in the project — do not introduce new dependencies without checking.
- Match the naming conventions of each platform (Swift, Kotlin, TypeScript).
- In this CocoaPods-based setup, import `AdyenCard` directly in Swift where card validators are used; avoid `#if canImport(AdyenCard)` guards for core iOS module flows.
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
7. If public API changed: reviewed for breaking changes and discussed with user

