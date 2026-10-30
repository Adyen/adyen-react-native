# E2E tests

Appium/WebdriverIO tests that check the library in freshly generated React Native and Expo apps. Each run generates a fixture app from a project template, installs the packed library into it, builds it for iOS and Android, and checks that the Drop-in button renders without a React Native error screen.

## Layout

- `run-appium.js`: entry point. Opens an Appium session, runs the tests, and saves failure artifacts.
- `helpers/driver.js`: builds the Appium session capabilities from environment variables.
- `helpers/elements.js`: selector and wait helpers. `byTestId` addresses a React Native `testID` on both platforms; `waitForAny` polls for an element and fails early on a React Native error screen.
- `helpers/utils.js`: screenshots, page sources, and React Native error screen detection.
- `tests/`: test cases.
- `template/`: the `App.tsx`, `MainActivity.kt`, and `secrets.js` files copied into the fixture app.
- `scripts/setup.sh`: generates the fixture app and copies the runner, helpers, tests, and scripts into it.
- `scripts/build-ios.sh`, `scripts/build-android.sh`: build and install the fixture app, start Metro, and run `run-appium.js`.

To add a test, put it in `tests/`, select elements with `byTestId`, and call it from `run-appium.js`.

## CI

`.github/workflows/pr_check.yml` runs the e2e jobs on pull requests with the `run-e2e-tests` label. It packs the library into a `.tgz`, then calls `.github/workflows/e2e_test.yml` once for each React Native and Expo version in its matrix. Each call:

1. Generates the fixture app with `scripts/setup.sh`, then adds the library `.tgz` and WebdriverIO to it.
2. Builds and tests it on an iOS simulator (macOS runner) with `build-ios.sh`.
3. Builds and tests it on an Android emulator (Linux runner) with `build-android.sh`.

Matrix entries for `latest` may fail without failing the workflow; they add an error annotation instead.

## Running locally

You need Node.js, Yarn, and Appium with the `xcuitest` driver (iOS) or the `uiautomator2` driver (Android). iOS also needs Xcode and CocoaPods. Android needs the Android SDK and a booted emulator or device.

Generate the fixture app and add the library from the repository root. `setup.sh` takes the app directory, the platform (`react-native` or `expo`), and the React Native version or Expo SDK version. The app directory must be directly inside the repository root.

```sh
yarn install
yarn prepare
bash e2e-tests/scripts/setup.sh tested_app react-native 0.85.3
npm pack
mv adyen-react-native-*.tgz tested_app/adyen-react-native.tgz

cd tested_app
touch yarn.lock
yarn add ./adyen-react-native.tgz
yarn add -D webdriverio
```

The Drop-in button test does not need real credentials. To inject a client key and public key into `secrets.js`, run `ADYEN_CLIENT_KEY=<key> ADYEN_PUBLIC_KEY=<key> bash ./inject_secrets.sh`.

Then, from the fixture app directory, build and test the app. Pass `expo` instead of `react-native` for an Expo fixture.

```sh
# iOS: start Appium, then build, install, and test on an iPhone simulator with the newest iOS runtime
bash ./start_appium.sh 4723 90
bash ./build-ios.sh react-native iPhone

# Android: builds, installs, and tests on the connected emulator; starts and stops Appium on port 4723 itself
bash ./build-android.sh react-native
```

The build scripts leave Metro running in the background and write its output to `metro.log`. On iOS, Appium also keeps running; its process ID is in `.appium.pid`.

To run the test again without rebuilding, keep Metro running, make sure Appium is running on port 4723 (`build-android.sh` stops it when it exits), and run `run-appium.js` from the fixture app directory:

```sh
# iOS (Expo fixtures use the bundle identifier com.testproject)
PLATFORM_NAME=ios IOS_UDID=<simulator-udid> IOS_BUNDLE_ID=org.reactjs.native.example.TestProject node ./run-appium.js

# Android
PLATFORM_NAME=android node ./run-appium.js
```

## Environment variables

`build-ios.sh` and `build-android.sh` set `PLATFORM_NAME`, `IOS_UDID`, `IOS_BUNDLE_ID`, and `APP_PACKAGE`. Set them yourself only when you run `run-appium.js` directly.

| Variable | Default | Description |
| --- | --- | --- |
| `PLATFORM_NAME` | iOS | Set to `android` to run on Android; any other value runs on iOS. |
| `IOS_UDID` | none (required on iOS) | UDID of the simulator to run on. |
| `IOS_BUNDLE_ID` | none (required on iOS) | Bundle identifier of the iOS app under test. |
| `APP_PACKAGE` | `com.testproject` | Package name of the Android app under test. |
| `ANDROID_UDID` | Appium default (first device) | Serial of the Android device or emulator to run on, as shown by `adb devices`. Set it when more than one device is attached. |
| `WDA_LOCAL_PORT` | Appium default (8100) | WebDriverAgent port. Set a free port when port 8100 is already in use, for example when running several iOS sessions at once. |

## Failure artifacts

When a test fails, `run-appium.js` saves `appium_failure.png` (a screenshot) and `appium_page_source.xml` (the view hierarchy) in the fixture app directory and exits with a non-zero code. CI uploads them as the `appium_failure_<os>_<platform>_<version>` and `appium_page_source_<os>_<platform>_<version>` artifacts. When the iOS build or test fails, CI also uploads `xcodebuild.log` as `xcodebuild_log_ios_<platform>_<version>`.
