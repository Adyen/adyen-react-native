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
    cli_version=$(bash ./scripts/resolve_rn_cli_version.sh "$version")
    echo "== Building React-Native $version (CLI $cli_version)"
    npx @react-native-community/cli@"$cli_version" init --directory $path --version "$version" --install-pods false --skip-install "$PROJECT_NAME"

    echo "== Add default MainActivity.kt"
    mkdir -p $path/android/app/src/main/java/com/testproject
    cp ./fixture/MainActivity.kt.template $path/android/app/src/main/java/com/testproject/MainActivity.kt
fi

cd $path || exit 1

# Ensure Yarn treats this directory as an independent project (not a workspace of the repo root)
touch yarn.lock

echo "== Install Dependencies"
cp ../adyen-react-native.tgz . || exit 1
yarn add ./adyen-react-native.tgz
yarn add -D webdriverio @wdio/cli @wdio/local-runner @wdio/appium-service

echo "== Copy scripts"
cp ../scripts/check-app.js ./check-app.js
cp ../scripts/inject_secrets.sh ./inject_secrets.sh
cp ../scripts/start_metro.sh ./start_metro.sh
cp ../scripts/resolve_ios_simulator.sh ./resolve_ios_simulator.sh
cp ../scripts/start_appium.sh ./start_appium.sh
cp ../scripts/fixture_ios.sh ./fixture_ios.sh
cp ../scripts/fixture_android.sh ./fixture_android.sh

echo "== Add default App.tsx"
cp ../fixture/App.tsx.template App.tsx
