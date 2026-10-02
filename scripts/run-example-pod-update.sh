#!/usr/bin/env bash
#
# Runs the example CocoaPods update with the Ruby and Bundler recorded in the
# repository Gemfile. Keep this command scoped to the Xcode version used for
# the example's generated pods; do not change global xcode-select.

set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

export DEVELOPER_DIR=/Applications/Xcode_27.2_beta.app/Contents/Developer
export BUNDLE_GEMFILE="$ROOT/Gemfile"

bash "$ROOT/scripts/ensure-xcframeworks.sh"

cd "$ROOT/example/ios"
exec /usr/local/adyen/bin/ruby \
  "$HOME/.gem/ruby/3.2.0/bin/bundle" \
  exec pod update
