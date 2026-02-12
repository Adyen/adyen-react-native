#!/usr/bin/env node

const fs = require('fs');

const PROJECT_NAME = process.argv[2] || 'TestProject';
const ANDROID_PACKAGE = process.argv[3] || 'com.testproject';

console.log('== Configuring Expo app.json');

try {
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

  // Update app name
  appJson.name = PROJECT_NAME;

  // Ensure expo object exists
  if (!appJson.expo) {
    appJson.expo = {};
  }

  // Configure Android package
  if (!appJson.expo.android) {
    appJson.expo.android = {};
  }
  appJson.expo.android.package = ANDROID_PACKAGE;

  // Configure iOS bundle identifier
  if (!appJson.expo.ios) {
    appJson.expo.ios = {};
  }
  appJson.expo.ios.bundleIdentifier = ANDROID_PACKAGE;

  // Add @adyen/react-native plugin
  if (!appJson.expo.plugins) {
    appJson.expo.plugins = [];
  }

  // Only add if not already present
  if (!appJson.expo.plugins.includes('@adyen/react-native')) {
    appJson.expo.plugins.unshift('@adyen/react-native');
    console.log('✓ Added @adyen/react-native plugin');
  }

  fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
  console.log(`✓ Configured app.json with package: ${ANDROID_PACKAGE}`);
} catch (error) {
  console.error('Error configuring app.json:', error.message);
  process.exit(1);
}
