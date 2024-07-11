#!/bin/bash

VERSION=$(cat package.json | python3 -c "import sys, json; print(json.load(sys.stdin)['version'])")
echo "Set Version"
echo $VERSION

IOS_PATH="ios/Version.swift"
ANDROID_PATH="android/build.gradle"

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/{SDK_VERSION}/$VERSION/g" $IOS_PATH
    sed -i '' "s/{SDK_VERSION}/$VERSION/g" $ANDROID_PATH
else
    sed -i -e "s|{SDK_VERSION}|$VERSION|g" $IOS_PATH
    sed -i -e "s|{SDK_VERSION}|$VERSION|g" $ANDROID_PATH
fi
