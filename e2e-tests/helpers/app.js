const { getConfig } = require('./driver');

/** Terminates and relaunches the app under test so each test starts on its launch screen. */
async function restartApp(driver) {
  const { isAndroid, androidAppPackage, iosBundleId } = getConfig();
  const args = isAndroid
    ? { appId: androidAppPackage }
    : { bundleId: iosBundleId };
  await driver.execute('mobile: terminateApp', args);
  await driver.execute('mobile: activateApp', args);
}

module.exports = { restartApp };
