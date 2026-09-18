const { execFileSync } = require('child_process');
const { createDriver, getConfig } = require('./helpers/driver');
const { saveScreenshot, savePageSource } = require('./helpers/utils');
const {
  testSessionsComponentsPayment,
} = require('./tests/sessions-components-payment.test');
const {
  testAdvancedCheckoutPayment,
} = require('./tests/advanced-checkout-payment.test');

// Runs payment-flow tests against the real example/ app (unlike run-appium.js, which uses a
// scaffolded fixture app). Reuses helpers/driver.js and helpers/utils.js conventions.
const TESTS = [
  { name: 'Sessions Components (Card)', run: testSessionsComponentsPayment },
  { name: 'Advanced Checkout (Card)', run: testAdvancedCheckoutPayment },
];

function relaunchAndroidApp(appPackage) {
  execFileSync('adb', ['shell', 'am', 'force-stop', appPackage]);
  execFileSync('adb', [
    'shell',
    'am',
    'start',
    '-n',
    `${appPackage}/.MainActivity`,
  ]);
}

function relaunchIOSApp(bundleId, udid) {
  try {
    // Suppress stdio: app isn't running on the first call, which would otherwise print noise.
    execFileSync('xcrun', ['simctl', 'terminate', udid, bundleId], {
      stdio: 'ignore',
    });
  } catch {
    // Expected on first call.
  }
  execFileSync('xcrun', ['simctl', 'launch', udid, bundleId]);
}

function relaunchApp({ isAndroid, androidAppPackage, iosBundleId, iosUdid }) {
  if (isAndroid) {
    relaunchAndroidApp(androidAppPackage);
  } else {
    relaunchIOSApp(iosBundleId, iosUdid);
  }
}

(async () => {
  const config = getConfig();
  const { isAndroid } = config;

  console.log(
    `\n==> [Test] Running example app payment tests on ${isAndroid ? 'Android' : 'iOS'}...`
  );

  const results = [];
  let driver;

  try {
    relaunchApp(config);
    await new Promise((resolve) =>
      setTimeout(resolve, isAndroid ? 5000 : 3000)
    );

    ({ driver } = await createDriver());

    for (const test of TESTS) {
      console.log(`\n==> [Test] Running: ${test.name}`);
      try {
        await test.run(driver, isAndroid);
        console.log(`==> [Test] PASS: ${test.name}`);
        results.push({ name: test.name, pass: true });
      } catch (error) {
        console.error(`==> [Test] FAIL: ${test.name}`);
        console.error(error);
        await savePageSource(
          driver,
          `./appium_page_source_${test.name.replace(/[^a-z0-9]+/gi, '-')}.xml`
        );
        await saveScreenshot(
          driver,
          `./appium_failure_${test.name.replace(/[^a-z0-9]+/gi, '-')}.png`
        );
        results.push({ name: test.name, pass: false, error });
      }

      relaunchApp(config);
      await new Promise((resolve) =>
        setTimeout(resolve, isAndroid ? 3000 : 2000)
      );
    }
  } finally {
    if (driver) {
      await driver.deleteSession().catch(() => {});
    }
  }

  console.log('\n==> [Test] Summary');
  for (const result of results) {
    console.log(`${result.pass ? 'PASS' : 'FAIL'} - ${result.name}`);
  }

  if (results.some((result) => !result.pass)) {
    process.exitCode = 1;
  }
})();
