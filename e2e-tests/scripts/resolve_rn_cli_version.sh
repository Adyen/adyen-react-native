#!/bin/bash

# Returns the React Native CLI version for a given RN version
# Arguments: rn_version (e.g., 0.82.4)
# Output: CLI version (e.g., ^19.0.0)

set -euo pipefail

rn_version=${1:-}

[ -z "$rn_version" ] && { echo "Error: RN version required" >&2; exit 1; }

major_version=$(echo "$rn_version" | cut -d '.' -f 1,2)

case $major_version in
  0.8[2-5]* ) echo '^20.0.0' ;;
  * )
    echo "Error: React Native $rn_version is unsupported; use 0.82 or newer." >&2
    exit 1
    ;;
esac
