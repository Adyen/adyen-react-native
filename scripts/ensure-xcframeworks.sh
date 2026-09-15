#!/bin/bash
#
# Ensures ios/frameworks/ (the per-module xcframeworks the podspec vendors, see its
# vendored_frameworks comment) exists before running `pod install`. Not committed to git - built
# locally from a checkout of https://github.com/Adyen/adyen-ios.
#
# Usage: ADYEN_IOS_PATH=/path/to/adyen-ios bash scripts/ensure-xcframeworks.sh
#
# Set FORCE_REBUILD_XCFRAMEWORKS=1 to rebuild even if ios/frameworks/ already exists (e.g. after
# bumping the pinned adyen-ios version).

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
FRAMEWORKS_DIR="$SCRIPT_DIR/../ios/frameworks"

if [ -d "$FRAMEWORKS_DIR/AdyenCheckout.xcframework" ] && [ "${FORCE_REBUILD_XCFRAMEWORKS:-}" != "1" ]; then
  echo "== ios/frameworks/ already present, skipping build (set FORCE_REBUILD_XCFRAMEWORKS=1 to force)"
  exit 0
fi

if [ -z "${ADYEN_IOS_PATH:-}" ]; then
  echo "Error: ios/frameworks/ is missing and ADYEN_IOS_PATH is not set." >&2
  echo "" >&2
  echo "Set it to a local checkout of https://github.com/Adyen/adyen-ios at the version this" >&2
  echo "SDK depends on (see adyen-react-native.podspec's vendored_frameworks comment for the" >&2
  echo "current pinned tag), e.g.:" >&2
  echo "" >&2
  echo "  ADYEN_IOS_PATH=../adyen-ios yarn app pod" >&2
  exit 1
fi

bash "$SCRIPT_DIR/build-xcframeworks.sh" "$ADYEN_IOS_PATH"
