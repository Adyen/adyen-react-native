#!/bin/bash

# Returns the React Native CLI version for a given RN version
# Arguments: rn_version (e.g., 0.80.2)
# Output: CLI version (e.g., ^19.0.0)

set -euo pipefail

rn_version=${1:-}

[ -z "$rn_version" ] && { echo "Error: RN version required" >&2; exit 1; }

major_version=$(echo "$rn_version" | cut -d '.' -f 1,2)

case $major_version in
  '0.81' | '0.82' ) echo '^20.0.0' ;;
  '0.80' ) echo '^19.0.0' ;;
  '0.79' ) echo '^18.0.0' ;;
  '0.76' | '0.77' | '0.78' ) echo '^15.0.0' ;;
  '0.75' ) echo '^14.0.0' ;;
  '0.74' ) echo '^13.0.0' ;;
  '0.73' ) echo '^12.0.0' ;;
  '0.72' ) echo '^11.0.0' ;;
  '0.71' ) echo '^10.0.0' ;;
  '0.70' ) echo '^9.0.0' ;;
  * ) echo '^15.0.0' ;;
esac
