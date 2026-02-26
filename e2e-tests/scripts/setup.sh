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

if [ "$platform" = "expo" ]; then
    echo "== Building Expo $version"
    npx create-expo-app "$path" --template blank-typescript@"$version" --no-install
    
    cd $path || exit 1
    
    # Configure app.json with proper package name and plugin
    node ../e2e-tests/scripts/configure-expo-app.js "$PROJECT_NAME" "com.testproject"
    
    # Add Expo-specific app files
    echo "== Add default App.tsx"
    cp ../e2e-tests/template/App.tsx.template App.tsx
    cp ../e2e-tests/template/secrets.js.template secrets.js
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

echo "== Copy e2e test files"
cp ../e2e-tests/run-appium.js ./
cp -r ../e2e-tests/helpers ./
cp -r ../e2e-tests/tests ./
cp ../e2e-tests/scripts/*.sh ./

echo "== Bundle CI dependencies"
mkdir -p .github/actions/setup-android-emulator
cp ../.github/actions/setup-android-emulator/action.yml .github/actions/setup-android-emulator/
