const { checkForRNErrors, saveScreenshot } = require('./utils');

const POLL_INTERVAL_MS = 1000;
const ERROR_CHECK_INTERVAL_MS = 5000;

// React Native maps `testID` to the accessibility identifier on iOS and to the
// view's resource-id on Android.
function byTestId(testID, isAndroid) {
  return isAndroid
    ? `android=new UiSelector().resourceId("${testID}")`
    : `~${testID}`;
}

async function findDisplayed(driver, selectors) {
  for (const selector of selectors) {
    const candidate = await driver.$(selector);
    const isDisplayed = await candidate.isDisplayed().catch(() => false);
    if (isDisplayed) {
      return candidate;
    }
  }
  return null;
}

/**
 * Polls until one of `selectors` is displayed and returns the first match.
 * Fails fast if a React Native error screen shows up while waiting.
 */
async function waitForAny(driver, selectors, { timeout }) {
  const startTime = Date.now();
  let lastErrorCheckAt = 0;

  while (Date.now() - startTime < timeout) {
    const now = Date.now();
    if (now - lastErrorCheckAt >= ERROR_CHECK_INTERVAL_MS) {
      await checkForRNErrors(driver, saveScreenshot);
      lastErrorCheckAt = now;
    }

    const element = await findDisplayed(driver, selectors);
    if (element) {
      return element;
    }
    await driver.pause(POLL_INTERVAL_MS);
  }

  throw new Error(
    `element (${JSON.stringify(selectors)}) still not displayed after ${timeout}ms`
  );
}

module.exports = {
  byTestId,
  waitForAny,
};
