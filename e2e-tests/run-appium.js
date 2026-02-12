const { createDriver } = require('./helpers/driver');
const { saveScreenshot, savePageSource } = require('./helpers/utils');
const { testDropInButtonVisible } = require('./tests/dropin-visible.test');

(async () => {
  const { driver, config } = await createDriver();
  const { isAndroid } = config;

  console.log(
    `\n==> [Test] Running tests on ${isAndroid ? 'Android' : 'iOS'}...`
  );

  try {
    await testDropInButtonVisible(driver, isAndroid);
  } catch (error) {
    console.error('==> [Test] FAILURE: Test failed.');
    console.error(error);

    await savePageSource(driver);
    await saveScreenshot(driver);

    process.exitCode = 1;
  } finally {
    await driver.deleteSession();
  }
})();
