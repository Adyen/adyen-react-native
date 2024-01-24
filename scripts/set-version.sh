#!/bin/bash

VERSION=$(cat package.json | python3 -c "import sys, json; print(json.load(sys.stdin)['version'])")
echo "Set Version"
echo $VERSION


IOS_PATH="ios/Version.swift"
sed -i '' "s/{SDK_VERSION}/$VERSION/g" $IOS_PATH

ANDROID_PATH="android/build.gradle"
sed -i '' "s/{SDK_VERSION}/$VERSION/g" $ANDROID_PATH