# Contributing

Contributions are welcome. Please read the [code of conduct](./CODE_OF_CONDUCT.md) and be respectful in project discussions.

## Project layout

This repository uses Yarn workspaces:

- `src/` contains the JavaScript and TypeScript SDK, including the Expo plugin in `src/plugin/` and React Native codegen specs in `src/specs/`.
- `ios/` and `android/` contain the native SDK integrations.
- `example/` contains the example app and native test targets.

See [Architecture](docs/Architecture.md) before changing native modules, events, or the SDK's public architecture.

## Set up a development checkout

Use the Node version in `.nvmrc`. From the repository root, run:

```sh
npm start
```

This bootstraps dependencies, builds the library, installs Git hooks, and generates local example-app configuration. Despite the command name, it does **not** start Metro. The project uses Yarn for its workspace commands.

If dependencies cannot be resolved, do not override the configured package registry; ask a maintainer for help. Bootstrap commands may regenerate lockfiles. Do not include incidental lockfile changes in a pull request.

## Run the example app

The example app uses the local SDK checkout. Start Metro in one terminal:

```sh
yarn app start
```

Run the app from another terminal:

```sh
yarn app android
```

For iOS, prepare the vendored Adyen frameworks and CocoaPods first:

```sh
yarn app pod
yarn app ios
```

If `ios/frameworks/` is missing, `yarn app pod` needs `ADYEN_IOS_PATH` pointing to a local checkout of `adyen-ios` at the version specified by `adyen.ios` in `package.json`:

```sh
ADYEN_IOS_PATH=/path/to/adyen-ios yarn app pod
```

The repository's pod wrapper uses a specific local Xcode, Ruby, and Bundler toolchain. If that toolchain is unavailable, ask a maintainer for the supported setup rather than changing global toolchain settings.

Native changes require rebuilding the example app. You can also open `example/android` in Android Studio or `example/ios/AdyenExample.xcworkspace` in Xcode after installing pods.

Payment flows in the example app require local Adyen test credentials. Keep `example/secrets.json` and other credentials out of commits.

## Test and format changes

Run the checks relevant to the code you changed:

| Changes | Checks |
| --- | --- |
| JavaScript or TypeScript | `yarn test`, `yarn lint`, `yarn typecheck` |
| Android | `yarn test:android`; format Kotlin with `ktlint android -F` |
| iOS | Run `yarn app pod`, then `yarn test:ios`; format Swift with `swiftformat ios` |
| Both native platforms | `yarn test:native` after preparing iOS pods |

The Android module has no standalone Gradle wrapper. To compile it through the example app, run:

```sh
cd example/android && ./gradlew :adyen_react-native:compileDebugKotlin
```

A successful build is useful, but it does not replace running tests. If native tests cannot run because a toolchain or dependency is unavailable, say so in the pull request.

When changing behavior across platforms, check that names, error codes, and values remain aligned. Update affected tests in `src/**/__tests__/`, `android/src/test/`, and `example/ios/AdyenExampleTests/`.

## Public TypeScript API changes

The committed API report is `etc/api/adyen-react-native.api.md`. For changes to exported types, components, hooks, or modules, run:

```sh
yarn prepare
yarn api-extractor
```

If the API change is intentional, review it for breaking changes, then regenerate the report:

```sh
yarn api-extractor:update
```

Include the generated report diff in your pull request. Do not edit the report manually or update it to hide an unintended change. Native API changes also need platform-specific review.

## Commits and pull requests

Start a focused branch from the latest `develop`. Keep pull requests small enough to review and test independently.

Use a commit subject in the form `<type>: <imperative description>`, where `type` is `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `deprecate`, or `remove`. The Git hooks run checks before commits.

In your pull request, explain what changed and why, link the relevant ticket, and list the tests you ran or could not run. Review documentation and the public API report when applicable. The React Native and Expo end-to-end CI jobs run when the pull request has the `run-e2e-tests` label.