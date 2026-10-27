#!/bin/bash

set -euo pipefail

platform=${1:-}
device_name=${2:-}

# Xcode 26's Apple Clang breaks consteval in fmt 11.0.2 (RN 0.76 - 0.80 and
# Expo SDK 52 pods fixtures). base.h ignores a pre-defined FMT_USE_CONSTEVAL,
# so patch the header. No-op when fmt is absent (newer pods, SPM fixtures).
patch_fmt_for_xcode26() {
  local fmt_base="ios/Pods/fmt/include/fmt/base.h"
  if [ -f "$fmt_base" ] && ! grep -q "Xcode 26 workaround" "$fmt_base"; then
    chmod 0644 "$fmt_base"
    perl -0pi -e 's/(#elif defined\(__cpp_consteval\)\n#  define FMT_USE_CONSTEVAL) 1/\/\/ Xcode 26 workaround: disable consteval\n$1 0/' "$fmt_base"
    echo "Patched $fmt_base"
  fi
}

# Echo the app's Xcode container under ios/ or fail; its base name doubles
# as the xcodebuild scheme.
detect_xcworkspace() {
  local found
  found=$(find ios -maxdepth 1 -name "*.xcworkspace" | head -n 1)
  if [ -z "$found" ]; then
    echo "Error: No .xcworkspace found in ios directory" >&2
    exit 1
  fi
  echo "$found"
}

detect_xcodeproj() {
  local found
  found=$(find ios -maxdepth 1 -name "*.xcodeproj" | head -n 1)
  if [ -z "$found" ]; then
    echo "Error: No .xcodeproj found in ios directory" >&2
    exit 1
  fi
  echo "$found"
}

if [ "$platform" = "expo" ]; then
  # Expo apps stay on CocoaPods and resolve the deprecated adyen-react-native
  # podspec. Pods are installed separately because prebuild hides the
  # `pod install` output, including the podspec deprecation warning.
  echo "::group::Prebuild Expo iOS [$(date '+%H:%M:%S')]"
  npx expo prebuild -p ios --clean --no-install
  echo "::endgroup::"

  echo "::group::Install Pods [$(date '+%H:%M:%S')]"
  (cd ios && pod install --repo-update)
  echo "::endgroup::"

  echo "::group::Patch fmt for Xcode 26 [$(date '+%H:%M:%S')]"
  patch_fmt_for_xcode26
  echo "::endgroup::"

  WORKSPACE=$(detect_xcworkspace)
  SCHEME=$(basename "$WORKSPACE" .xcworkspace)
  XCODE_CONTAINER=(-workspace "$WORKSPACE")
elif [ -f node_modules/react-native/scripts/setup-apple-spm.js ]; then
  # React Native CLI apps that ship the SPM tooling (scripts/setup-apple-spm.js,
  # RN 0.87+) build through Swift Package Manager; the library is linked through
  # its own ios/Package.swift. `pod deintegrate` strips the template's
  # CocoaPods wiring from the Xcode project; `pod install` never runs.
  echo "Swift Package Manager tooling found: building the React Native fixture through SPM"
  echo "::group::Set up Swift Package Manager [$(date '+%H:%M:%S')]"
  # @react-native-community/cli only detects ios/ through a Podfile, which the
  # SPM app no longer has; spm-cli-config.js fills in project.ios instead.
  # `spm add` pins it in .spm-injected.json for later syncs and Xcode builds.
  RCT_SPM_AUTOLINKING_CONFIG_COMMAND='["node","spm-cli-config.js"]' \
    npx react-native spm add --deintegrate --yes
  rm -f ios/Podfile ios/Podfile.lock
  echo "::endgroup::"

  PROJECT=$(detect_xcodeproj)
  SCHEME=$(basename "$PROJECT" .xcodeproj)
  XCODE_CONTAINER=(-project "$PROJECT")
else
  # Older React Native CLI apps ship no SPM tooling (RN <= 0.86), so they stay
  # on CocoaPods and resolve the deprecated adyen-react-native podspec - this
  # is also what keeps the podspec covered by CI on older React Native.
  echo "No Swift Package Manager tooling found: building the React Native fixture through CocoaPods"
  echo "::group::Patch toolchain search paths for pods [$(date '+%H:%M:%S')]"
  # On Xcode 26, pods builds need the template's swift library search paths
  # spelled with $(DT_TOOLCHAIN_DIR) instead of $(TOOLCHAIN_DIR). The SPM
  # branch above must NOT get this patch - it breaks SPM fixture builds.
  PROJECT=$(detect_xcodeproj)
  project_file="$PROJECT/project.pbxproj"
  if grep -q '\$(TOOLCHAIN_DIR)/usr/lib/swift/\$(PLATFORM_NAME)' "$project_file"; then
    perl -0pi -e 's/\$\(TOOLCHAIN_DIR\)(\/usr\/lib\/swift\/\$\(PLATFORM_NAME\))/\$(DT_TOOLCHAIN_DIR)$1/g' "$project_file"
    echo "Patched $project_file"
  fi
  echo "::endgroup::"

  echo "::group::Install Pods [$(date '+%H:%M:%S')]"
  (cd ios && pod install --repo-update)
  echo "::endgroup::"

  echo "::group::Patch fmt for Xcode 26 [$(date '+%H:%M:%S')]"
  patch_fmt_for_xcode26
  echo "::endgroup::"

  WORKSPACE=$(detect_xcworkspace)
  SCHEME=$(basename "$WORKSPACE" .xcworkspace)
  XCODE_CONTAINER=(-workspace "$WORKSPACE")
fi

echo "Using ${XCODE_CONTAINER[*]} with scheme: $SCHEME"

# Resolve simulator UDID
UDID=$(bash ./resolve_ios_simulator.sh "$device_name")

echo "::group::Build iOS [$(date '+%H:%M:%S')]"
if ! command -v xcbeautify &> /dev/null; then
  echo "Installing xcbeautify..."
  HOMEBREW_NO_AUTO_UPDATE=1 brew install xcbeautify
fi

XCODEBUILD_LOG="xcodebuild.log"
xcodebuild "${XCODE_CONTAINER[@]}" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath build \
  2>&1 | tee "$XCODEBUILD_LOG" | xcbeautify --renderer github-actions
echo "::endgroup::"

echo "::group::Start Metro [$(date '+%H:%M:%S')]"
bash ./start_metro.sh
echo "::endgroup::"

echo "::group::Install App on Simulator [$(date '+%H:%M:%S')]"
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "build/Build/Products/Debug-iphonesimulator/$SCHEME.app"
echo "::endgroup::"

echo "::group::Run Appium Tests [$(date '+%H:%M:%S')]"
export PLATFORM_NAME=ios
export IOS_UDID="$UDID"
if [ "$platform" = "expo" ]; then
  export IOS_BUNDLE_ID="com.testproject"
else
  export IOS_BUNDLE_ID="org.reactjs.native.example.$SCHEME"
fi
node ./run-appium.js
echo "::endgroup::"
