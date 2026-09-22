#!/bin/bash
#
# Builds standalone .xcframeworks for every Adyen module this SDK bridges to, from a local
# checkout of https://github.com/Adyen/adyen-ios, and drops them into ios/frameworks/.
#
# Each module gets its own .framework/.xcframework (rather than depending on the umbrella
# `Adyen` CocoaPod, which merges every module into a single compiled module and makes
# `canImport(AdyenCard)` / `canImport(AdyenComponents)` / `canImport(AdyenActions)` false).
#
# Usage:
#   ./scripts/build-xcframeworks.sh <path-to-adyen-ios-checkout> [output-dir]
#
# TESTABLE=1 builds a variant AdyenExampleTests can @testable import - mutually exclusive with
# the normal distribution build (BUILD_LIBRARY_FOR_DISTRIBUTION only emits a .swiftinterface,
# never a real .swiftmodule, and @testable needs the latter).
#
# SPM_CACHE_DIR points at a dir already resolved via
# `xcodebuild -resolvePackageDependencies -clonedSourcePackagesDirPath`, to skip re-resolving.
#
# Requires: Xcode command line tools, a local adyen-ios checkout at the desired version/tag.

set -euo pipefail

ADYEN_IOS_PATH=${1:?"Usage: $0 <path-to-adyen-ios-checkout> [output-dir]"}
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR=${2:-"$SCRIPT_DIR/../ios/frameworks"}
PROJECT="$ADYEN_IOS_PATH/Adyen.xcodeproj"

if [ ! -d "$PROJECT" ]; then
  echo "Error: $PROJECT not found. Pass the path to a local adyen-ios checkout." >&2
  exit 1
fi

# Modules the react-native bridge depends on (transitively equivalent to the podspec's
# 'Checkout' subspec today), in dependency order. AdyenCheckout is last since it aggregates
# the rest; xcodebuild resolves each scheme's own internal dependencies regardless of order,
# this ordering is just for readable build output.
MODULES=(
  Adyen
  AdyenEncryption
  AdyenUI
  AdyenCard
  AdyenComponents
  AdyenActions
  AdyenSession
  AdyenDropIn
  AdyenCheckout
)

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

mkdir -p "$OUTPUT_DIR"

if [ "${TESTABLE:-}" = "1" ]; then
  DISTRIBUTION_FLAGS=(BUILD_LIBRARY_FOR_DISTRIBUTION=NO SWIFT_ENABLE_TESTABILITY=YES)
  # No .swiftinterface without library evolution - -create-xcframework needs telling it's fine.
  XCFRAMEWORK_FLAGS=(-allow-internal-distribution)
else
  DISTRIBUTION_FLAGS=(BUILD_LIBRARY_FOR_DISTRIBUTION=YES)
  XCFRAMEWORK_FLAGS=()
fi

if [ -n "${SPM_CACHE_DIR:-}" ]; then
  SPM_FLAGS=(-clonedSourcePackagesDirPath "$SPM_CACHE_DIR" -disableAutomaticPackageResolution -onlyUsePackageVersionsFromResolvedFile)
else
  SPM_FLAGS=()
fi

build_slice() {
  local module=$1
  local platform=$2
  local archive_path=$3

  echo "== Archiving $module for $platform"
  # Ad-hoc signed (CODE_SIGN_IDENTITY="-"): these are intermediate library archives, not an
  # app — they get re-signed as part of whatever app eventually links them, so this build
  # doesn't need (and shouldn't require) a real signing certificate.
  # "${ARR[@]+"${ARR[@]}"}": bash 3.2 (macOS's /bin/bash) errors on an empty array under `set -u`.
  if command -v xcbeautify > /dev/null 2>&1; then
    xcodebuild archive \
      -project "$PROJECT" \
      -scheme "$module" \
      -destination "generic/platform=$platform" \
      -archivePath "$archive_path" \
      -configuration Release \
      "${SPM_FLAGS[@]+"${SPM_FLAGS[@]}"}" \
      SKIP_INSTALL=NO \
      "${DISTRIBUTION_FLAGS[@]}" \
      CODE_SIGN_IDENTITY="-" \
      CODE_SIGNING_REQUIRED=NO \
      CODE_SIGNING_ALLOWED=NO \
      | xcbeautify
  else
    xcodebuild archive \
      -project "$PROJECT" \
      -scheme "$module" \
      -destination "generic/platform=$platform" \
      -archivePath "$archive_path" \
      -configuration Release \
      "${SPM_FLAGS[@]+"${SPM_FLAGS[@]}"}" \
      SKIP_INSTALL=NO \
      "${DISTRIBUTION_FLAGS[@]}" \
      CODE_SIGN_IDENTITY="-" \
      CODE_SIGNING_REQUIRED=NO \
      CODE_SIGNING_ALLOWED=NO
  fi
}

for MODULE in "${MODULES[@]}"; do
  echo "::group::Building $MODULE"

  DEVICE_ARCHIVE="$WORKDIR/$MODULE-iphoneos.xcarchive"
  SIM_ARCHIVE="$WORKDIR/$MODULE-iphonesimulator.xcarchive"

  build_slice "$MODULE" "iOS" "$DEVICE_ARCHIVE"
  build_slice "$MODULE" "iOS Simulator" "$SIM_ARCHIVE"

  DEVICE_FRAMEWORK="$DEVICE_ARCHIVE/Products/Library/Frameworks/$MODULE.framework"
  SIM_FRAMEWORK="$SIM_ARCHIVE/Products/Library/Frameworks/$MODULE.framework"

  if [ ! -d "$DEVICE_FRAMEWORK" ] || [ ! -d "$SIM_FRAMEWORK" ]; then
    echo "Error: expected framework not found for $MODULE (checked $DEVICE_FRAMEWORK and $SIM_FRAMEWORK)" >&2
    exit 1
  fi

  DEST="$OUTPUT_DIR/$MODULE.xcframework"
  rm -rf "$DEST"

  xcodebuild -create-xcframework \
    -framework "$DEVICE_FRAMEWORK" \
    -framework "$SIM_FRAMEWORK" \
    "${XCFRAMEWORK_FLAGS[@]+"${XCFRAMEWORK_FLAGS[@]}"}" \
    -output "$DEST"

  echo "== Wrote $DEST"
  echo "::endgroup::"
done

echo "== Done. Built ${#MODULES[@]} xcframeworks into $OUTPUT_DIR"
