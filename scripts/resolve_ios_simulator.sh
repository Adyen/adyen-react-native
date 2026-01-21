#!/bin/bash

# Resolves iOS simulator UDID
# Arguments: [device_pattern] [os_version]
# Output: UDID

set -euo pipefail

device_pattern=${1:-iPhone}
requested_os=${2:-}

# Get runtime (use requested or latest available)
if [ -n "$requested_os" ]; then
  RUNTIME="iOS $requested_os"
else
  RUNTIME=$(xcrun simctl list runtimes | grep -E '^iOS ' | grep -v unavailable | awk '{print $1" "$2}' | tail -n 1)
fi

[ -z "$RUNTIME" ] && { echo "Error: No iOS runtime found" >&2; exit 1; }

# Find device matching pattern and extract UDID
device_line=$(xcrun simctl list devices "$RUNTIME" | grep -E "${device_pattern}.*\(" | head -n 1)
UDID=$(echo "$device_line" | awk -F '[()]' '{print $2}')

[ -z "$UDID" ] && { echo "Error: No device matching '$device_pattern' for $RUNTIME" >&2; exit 1; }

echo "== Using $device_pattern on $RUNTIME: $UDID" >&2
echo "$UDID"
