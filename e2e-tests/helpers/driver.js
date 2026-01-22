const { remote } = require('webdriverio');

function getConfig() {
  const isAndroid = process.env.PLATFORM_NAME === 'android';
  const androidAppPackage = process.env.APP_PACKAGE || 'com.testproject';
  const androidAppActivity = '.MainActivity';
  const iosScheme = process.env.IOS_SCHEME || 'TestProject';
  const iosBundleId = 'org.reactjs.native.example.' + iosScheme;
  const iosUdid = process.env.IOS_UDID;

  return {
    isAndroid,
    androidAppPackage,
    androidAppActivity,
    iosScheme,
    iosBundleId,
    iosUdid,
  };
}

async function createDriver() {
  const config = getConfig();
  const { isAndroid, androidAppPackage, androidAppActivity, iosBundleId, iosUdid } = config;

  const connectionRetryTimeout = isAndroid ? 240000 : 600000;
  const connectionRetryCount = isAndroid ? 3 : 5;

  const driver = await remote({
    protocol: 'http',
    hostname: '127.0.0.1',
    path: '/',
    port: 4723,
    connectionRetryTimeout,
    connectionRetryCount,
    capabilities: isAndroid
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
          'appium:wdaLaunchTimeout': 600000,
          'appium:wdaConnectionTimeout': 600000,
          'appium:wdaStartupRetries': 3,
          'appium:wdaStartupRetryInterval': 20000,
          'appium:udid': iosUdid,
        },
    logLevel: 'error',
  });

  return { driver, config };
}

module.exports = {
  createDriver,
  getConfig,
};
