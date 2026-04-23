#!/bin/bash
# Copyright (c) 2026 Adyen N.V.
#
# This file is open source and available under the MIT license.
# See the LICENSE file for more info.

set -e

if [ -z "$VERSION" ]; then
  echo "Error: VERSION environment variable is not set"
  exit 1
fi

# Semver regex pattern
SEMVER_REGEX='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'

if [[ ! "$VERSION" =~ $SEMVER_REGEX ]]; then
  echo "Error: Invalid semver: $VERSION"
  exit 1
fi

echo "Valid semver: $VERSION"
