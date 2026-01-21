#!/bin/bash

set -euo pipefail

# Default values
expo=''
rn=''
name="tested_app"

# Parse flags
while getopts r:e:n: flag
do
    case "${flag}" in
        r) rn=${OPTARG}
           ;;
        e) expo=${OPTARG}
           ;;
        n) name=${OPTARG}
           ;;
    esac
done

if [ -z "$name" ]; then
  echo "Error: App name argument missing."
  exit 1
fi

# Sanitize name
name=${name//./}

# Clean previous runs
rm -rf "$name"

# Determine CLI version based on RN version
major_version=$(echo "$rn" | cut -d '.' -f 1,2)

case $major_version in
  '0.81' | '0.82' ) cli_version='^20.0.0' ;;
  '0.80' ) cli_version='^19.0.0' ;;
  '0.79' ) cli_version='^18.0.0' ;;
  '0.76' | '0.77' | '0.78' ) cli_version='^15.0.0' ;;
  '0.75' ) cli_version='^14.0.0' ;;
  '0.74' ) cli_version='^13.0.0' ;;
  '0.73' ) cli_version='^12.0.0' ;;
  '0.72' ) cli_version='^11.0.0' ;;
  '0.71' ) cli_version='^10.0.0' ;;
  '0.70' ) cli_version='^9.0.0' ;;
  * )      cli_version='15.1.3' ;;
esac

echo "== Using CLI $cli_version"

if [ ! -z "$expo" ]; then
    echo "== Building Expo"
    npx create-expo-app "$name" --template default@"$expo" --no-install
else
    echo "== Building React-Native $rn"
    npx @react-native-community/cli@"$cli_version" init --directory "$name" --version "$rn" --install-pods false --skip-install TestProject
fi

cd "$name" || exit

# Ensure Yarn treats this directory as an independent project (not a workspace of the repo root)
touch yarn.lock

echo -e "== Install Dependencies\n"
cp ../adyen-react-native.tgz . || exit 1
yarn add ./adyen-react-native.tgz
yarn add -D webdriverio @wdio/cli @wdio/local-runner @wdio/appium-service

cp ../scripts/check-app.js ./check-app.js

echo -e "== Add default App.tsx\n"
cp ../fixture/App.tsx.template App.tsx
