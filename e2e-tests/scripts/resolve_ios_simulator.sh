#!/bin/bash

# Resolves iOS simulator UDID
# Arguments: [device_pattern] [os_version]
# Output: UDID

set -euo pipefail

device_pattern=${1:-iPhone}
requested_os=${2:-}

# Determine runtime filter for simctl (version prefix or latest iOS)
if [ -n "$requested_os" ]; then
  RUNTIME_FILTER="$requested_os"
else
  RUNTIME_FILTER=$(xcrun simctl list runtimes | grep -E '^iOS ' | (grep -v unavailable || true) | awk '{print $2}' | tail -n 1 || true)
  [ -z "$RUNTIME_FILTER" ] && { echo "Error: No iOS runtime found" >&2; exit 1; }
fi

echo "== Using runtime filter: $RUNTIME_FILTER" >&2
# Prefer plain numbered model (e.g. "iPhone 17 (UDID)") over variants (Pro, SE, Air...)
device_line=$(xcrun simctl list devices "$RUNTIME_FILTER" | grep -E "^\s+${device_pattern} [0-9]+ \(" | sort -t' ' -k2 -V | tail -n 1 || true)
# Fall back to any matching device sorted by second word
if [ -z "$device_line" ]; then
  device_line=$(xcrun simctl list devices "$RUNTIME_FILTER" | grep -E "^\s+${device_pattern}.*\(" | grep -v "^==" | sort -t' ' -k2 -V | tail -n 1 || true)
fi
UDID=$(echo "$device_line" | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}')

[ -z "$UDID" ] && { echo "Error: No device matching '$device_pattern' for $RUNTIME_FILTER" >&2; exit 1; }

echo "== Using $device_pattern on $RUNTIME_FILTER: $UDID" >&2
echo "$UDID"
