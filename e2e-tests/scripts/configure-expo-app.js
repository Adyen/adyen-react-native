#!/usr/bin/env node

const fs = require('fs');

const PROJECT_NAME = process.argv[2] || 'TestProject';
const PACKAGE_NAME = process.argv[3] || 'com.testproject';

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
  appJson.expo.android.package = PACKAGE_NAME;

  // Configure iOS bundle identifier
  if (!appJson.expo.ios) {
    appJson.expo.ios = {};
  }
  appJson.expo.ios.bundleIdentifier = PACKAGE_NAME;

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
  console.log(`✓ Configured app.json with package: ${PACKAGE_NAME}`);
} catch (error) {
  console.error('Error configuring app.json:', error.message);
  process.exit(1);
}
