#!/bin/bash

set -euo pipefail

VERSION=$(node -p "require('./package.json').version")
mkdir -p lib
printf "export const adyenSDKVersion = '%s';\n" "$VERSION" > lib/Version.ts
