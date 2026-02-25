const { remote } = require('webdriverio');

function getConfig() {
  const isAndroid = process.env.PLATFORM_NAME === 'android';
  const androidAppPackage = process.env.APP_PACKAGE || 'com.testproject';
  const androidAppActivity = '.MainActivity';
  const iosBundleId = process.env.IOS_BUNDLE_ID;
  const iosUdid = process.env.IOS_UDID;

  return {
    isAndroid,
    androidAppPackage,
    androidAppActivity,
    iosBundleId,
    iosUdid,
  };
}

async function createDriver() {
  const config = getConfig();
  const {
    isAndroid,
    androidAppPackage,
    androidAppActivity,
    iosBundleId,
    iosUdid,
  } = config;

  const connectionRetryTimeout = isAndroid ? 240000 : 600000;
  const connectionRetryCount = isAndroid ? 3 : 5;

  const capabilities = isAndroid
    ? {
      'platformName': 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': androidAppPackage,
      'appium:appActivity': androidAppActivity,
      'appium:newCommandTimeout': 120,
    }
    : {
      'platformName': 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:bundleId': iosBundleId,
      'appium:newCommandTimeout': 120,
      'appium:wdaLaunchTimeout': 180000,
      'appium:wdaConnectionTimeout': 180000,
      'appium:wdaStartupRetries': 2,
      'appium:wdaStartupRetryInterval': 15000,
      'appium:udid': iosUdid,
      'appium:skipUnlock': true,
      'appium:waitForQuiescence': false,
      'appium:simpleIsVisibleCheck': true,
    };
    
  const driver = await remote({
    protocol: 'http',
    hostname: '127.0.0.1',
    path: '/',
    port: 4723,
    connectionRetryTimeout,
    connectionRetryCount,
    capabilities: capabilities,
    logLevel: 'error',
  });

  return { driver, config };
}

module.exports = {
  createDriver,
  getConfig,
};
