#!/bin/bash

set -euo pipefail

path=${1:-'tested_app'}
platfor=${2:-}
version=${3:-}

PROJECT_NAME='TestProject'

if [ "$platfor" == "Expo" ]; then
    echo "== Building Expo $version"
    npx create-expo-app $path --template default@"$version" --no-install
    # Update app name in app.json
    sed -i.bak "s/\"name\": \"[^\"]*\"/\"name\": \"$PROJECT_NAME\"/" "$path/app.json" && rm -f "$path/app.json.bak"
else
    cli_version=$(bash ./scripts/resolve_rn_cli_version.sh "$version")
    echo "== Building React-Native $version (CLI $cli_version)"
    npx @react-native-community/cli@"$cli_version" init --directory $path --version "$version" --install-pods false --skip-install "$PROJECT_NAME"
fi

cd $path || exit 1

# Ensure Yarn treats this directory as an independent project (not a workspace of the repo root)
touch yarn.lock

echo -e "== Install Dependencies\n"
cp ../adyen-react-native.tgz . || exit 1
yarn add ./adyen-react-native.tgz
yarn add -D webdriverio @wdio/cli @wdio/local-runner @wdio/appium-service

cp ../scripts/check-app.js ./check-app.js

echo -e "== Add default App.tsx\n"
cp ../fixture/App.tsx.template App.tsx
