#!/bin/bash

set -euo pipefail

path=${1:-'tested_app'}
platform=${2:-}
version=${3:-}

PROJECT_NAME='TestProject'

if [ "$platform" == "Expo" ]; then
    echo "== Building Expo $version"
    npx create-expo-app $path --template default@"$version" --no-install
    # Update app name in app.json
    sed -i.bak "s/\"name\": \"[^\"]*\"/\"name\": \"$PROJECT_NAME\"/" "$path/app.json" && rm -f "$path/app.json.bak"
else
    cli_version=$(bash ./e2e-tests/scripts/resolve_rn_cli_version.sh "$version")
    echo "== Building React-Native $version (CLI $cli_version)"
    npx @react-native-community/cli@"$cli_version" init --directory $path --version "$version" --install-pods false --skip-install "$PROJECT_NAME"

    echo "== Add default MainActivity.kt"
    mkdir -p $path/android/app/src/main/java/com/testproject
    cp ./e2e-tests/template/MainActivity.kt.template $path/android/app/src/main/java/com/testproject/MainActivity.kt
fi

cd $path || exit 1

# Ensure Yarn treats this directory as an independent project (not a workspace of the repo root)
touch yarn.lock

echo "== Install Dependencies"
cp ../adyen-react-native.tgz . || exit 1
yarn add ./adyen-react-native.tgz
yarn add -D webdriverio @wdio/cli @wdio/local-runner @wdio/appium-service

echo "== Copy e2e test files"
cp ../e2e-tests/run-appium.js ./
cp -r ../e2e-tests/helpers ./
cp -r ../e2e-tests/tests ./
cp ../e2e-tests/scripts/*.sh ./

echo "== Add default App.tsx"
cp ../e2e-tests/template/App.tsx.template App.tsx
