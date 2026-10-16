const { createDriver } = require('./helpers/driver');
const { restartApp } = require('./helpers/app');
const { waitForAny, byTestId } = require('./helpers/elements');
const { saveScreenshot, savePageSource } = require('./helpers/utils');
const {
  testDropInButtonVisible,
  dropInButtonSelectors,
} = require('./tests/dropin-visible.test');
const {
  testLaunchShowsHome,
  testSessionsDropInPayment,
  testSessionsDropInErrorPath,
} = require('./tests/example-app.test');

const TARGET_DETECTION_TIMEOUT_MS = 180000;

// The CI fixture app (e2e-tests/template) only renders the Drop-in button.
const FIXTURE_TESTS = [['Drop-in button visible', testDropInButtonVisible]];

const EXAMPLE_TESTS = [
  ['Launch shows Home', testLaunchShowsHome],
  ['Drop-in button visible', testDropInButtonVisible],
  ['Sessions DropIn payment', testSessionsDropInPayment],
  ['Sessions DropIn error path', testSessionsDropInErrorPath],
];

async function detectTarget(driver, isAndroid) {
  const fromEnv = process.env.E2E_TARGET;
  if (fromEnv === 'example' || fromEnv === 'fixture') {
    return fromEnv;
  }
  const exampleMarker = byTestId('menu-sessions-dropin', isAndroid);
  const { selector } = await waitForAny(
    driver,
    [exampleMarker, ...dropInButtonSelectors(isAndroid)],
    { timeout: TARGET_DETECTION_TIMEOUT_MS }
  );
  return selector === exampleMarker ? 'example' : 'fixture';
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

(async () => {
  const { driver, config } = await createDriver();
  const { isAndroid } = config;

  console.log(
    `\n==> [Test] Running tests on ${isAndroid ? 'Android' : 'iOS'}...`
  );

  try {
    const target = await detectTarget(driver, isAndroid);
    const tests = target === 'example' ? EXAMPLE_TESTS : FIXTURE_TESTS;
    console.log(`==> [Test] Target app: ${target} (${tests.length} tests)`);

    const failures = [];
    for (const [index, [name, test]] of tests.entries()) {
      console.log(`\n==> [Test] ${name}`);
      try {
        if (index > 0) {
          await restartApp(driver);
        }
        await test(driver, isAndroid);
      } catch (error) {
        console.error(`==> [Test] FAILURE: ${name}`);
        console.error(error);
        await savePageSource(driver, `./appium_page_source_${slug(name)}.xml`);
        await saveScreenshot(driver, `./appium_failure_${slug(name)}.png`);
        failures.push(name);
      }
    }

    const passed = tests.length - failures.length;
    console.log(`\n==> [Test] ${passed}/${tests.length} tests passed.`);
    if (failures.length > 0) {
      console.error(`==> [Test] Failed: ${failures.join(', ')}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('==> [Test] FAILURE: Test run aborted.');
    console.error(error);

    await savePageSource(driver);
    await saveScreenshot(driver);

    process.exitCode = 1;
  } finally {
    await driver.deleteSession();
  }
})();
