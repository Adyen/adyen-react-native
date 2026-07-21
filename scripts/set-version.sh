#!/bin/bash

set -euo pipefail

VERSION=$(python3 -c "import json; print(json.load(open('package.json'))['version'])")
mkdir -p lib
printf "export const adyenSDKVersion = '%s';\n" "$VERSION" > lib/Version.ts
