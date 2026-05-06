#!/usr/bin/env bash
set -euo pipefail

function convert_xccov_to_xml {
  sed -n                                                                                       \
      -e '/:$/s/&/\&amp;/g;s/^\(.*\):$/  <file path="\1">/p'                                   \
      -e 's/^ *\([0-9][0-9]*\): 0.*$/    <lineToCover lineNumber="\1" covered="false"\/>/p'    \
      -e 's/^ *\([0-9][0-9]*\): [1-9].*$/    <lineToCover lineNumber="\1" covered="true"\/>/p' \
      -e 's/^$/  <\/file>/p'
}

# Filters <file> blocks by --filter prefix and strips --strip prefix from paths.
function filter_and_strip {
  local filter="$1" strip="$2"
  awk -v filter="$filter" -v strip="$strip" '
    /^  <file path=/ {
      keep = (filter == "" || index($0, filter) > 0)
      if (keep && strip != "") {
        p = "  <file path=\""
        if (index($0, p strip) == 1) $0 = p substr($0, length(p strip) + 1)
      }
    }
    !/^  <file path=/ && !/^  <\/file>/ && !/^    <lineToCover/ { print; next }
    keep { print }
  '
}

function xccov_to_generic {
  local xcresult="$1"
  echo '<?xml version="1.0"?>'
  echo '<coverage version="1">'
  if [[ -n "$filter_prefix" || -n "$strip_prefix" ]]; then
    xcrun xccov view --archive "$xcresult" | convert_xccov_to_xml | filter_and_strip "$filter_prefix" "$strip_prefix"
  else
    xcrun xccov view --archive "$xcresult" | convert_xccov_to_xml
  fi
  echo '</coverage>'
}

function check_xcode_version() {
  local major=${1:-0} minor=${2:-0}
  return $(( (major >= 14) || (major == 13 && minor >= 3) ))
}

xcresult=""
filter_prefix=""
strip_prefix=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --filter)
      if [[ $# -lt 2 ]]; then echo "Error: --filter requires an argument" >&2; exit 1; fi
      filter_prefix="$2"; shift 2 ;;
    --strip)
      if [[ $# -lt 2 ]]; then echo "Error: --strip requires an argument" >&2; exit 1; fi
      strip_prefix="$2";  shift 2 ;;
    *) xcresult="$1"; shift ;;
  esac
done

if [[ -z "$xcresult" ]]; then
  echo "Invalid number of arguments. Expecting 1 path matching '*.xcresult'"
  exit 1
elif ! xcode_version="$(xcodebuild -version | sed -n '1s/^Xcode \([0-9.]*\)$/\1/p')"; then
  echo 'Failed to get Xcode version' 1>&2
  exit 1
elif check_xcode_version ${xcode_version//./ }; then
  echo "Xcode version '$xcode_version' not supported, version 13.3 or above is required" 1>&2;
  exit 1
elif [[ ! -d $xcresult ]]; then
  echo "Path not found: $xcresult" 1>&2;
  exit 1
elif [[ $xcresult != *".xcresult"* ]]; then
  echo "Expecting input to match '*.xcresult', got: $xcresult" 1>&2;
  exit 1
fi

xccov_to_generic "$xcresult"
