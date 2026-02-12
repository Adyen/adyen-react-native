#!/bin/bash

set -euo pipefail

path=${1:-'tested_app'}
platform=${2:-}
version=${3:-}

if [ -z "$platform" ] || [ -z "$version" ]; then
  echo "Error: platform and version are required"
  exit 1
fi

PROJECT_NAME='TestProject'

if [ "$platform" = "Expo" ]; then
    echo "== Building Expo $version"
    npx create-expo-app $path --template default@"$version" --no-install
    
    cd $path || exit 1
    
    # Configure app.json with proper package name and plugin
    node ../e2e-tests/scripts/configure-expo-app.js "$PROJECT_NAME" "com.testproject"
    
    # Add Expo-specific app files
    echo "== Add default index.tsx"
    mkdir -p "app/(tabs)"
    cp ../e2e-tests/template/App.tsx.template "app/(tabs)/index.tsx"
    cp ../e2e-tests/template/secrets.js.template "app/(tabs)/secrets.js"
else
    cli_version=$(bash ./e2e-tests/scripts/resolve_rn_cli_version.sh "$version")
    echo "== Building React-Native $version (CLI $cli_version)"
    npx @react-native-community/cli@"$cli_version" init --directory $path --version "$version" --install-pods false --skip-install "$PROJECT_NAME"

    cd $path || exit 1
    
    # Add React Native-specific files
    echo "== Add default MainActivity.kt"
    mkdir -p android/app/src/main/java/com/testproject
    cp ../e2e-tests/template/MainActivity.kt.template android/app/src/main/java/com/testproject/MainActivity.kt
    
    echo "== Add default App.tsx"
    cp ../e2e-tests/template/App.tsx.template App.tsx
    cp ../e2e-tests/template/secrets.js.template secrets.js
fi

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
