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
      return { element: candidate, selector };
    }
  }
  return null;
}

/**
 * Polls until one of `selectors` is displayed and returns the first match.
 * Fails fast if a React Native error screen shows up while waiting.
 */
async function waitForAny(
  driver,
  selectors,
  { timeout = 60000, checkErrors = true } = {}
) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  const startTime = Date.now();
  let lastErrorCheckAt = 0;

  while (Date.now() - startTime < timeout) {
    const now = Date.now();
    if (checkErrors && now - lastErrorCheckAt >= ERROR_CHECK_INTERVAL_MS) {
      await checkForRNErrors(driver, saveScreenshot);
      lastErrorCheckAt = now;
    }

    const found = await findDisplayed(driver, list);
    if (found) {
      return found;
    }
    await driver.pause(POLL_INTERVAL_MS);
  }

  throw new Error(
    `element (${JSON.stringify(list)}) still not displayed after ${timeout}ms`
  );
}

async function tap(driver, selectors, options) {
  const { element } = await waitForAny(driver, selectors, options);
  await element.click();
  return element;
}

async function isAnyDisplayed(driver, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  return (await findDisplayed(driver, list)) !== null;
}

const IOS_LOGBOX_TOAST =
  "-ios predicate string:label ENDSWITH 'Open debugger to view warnings.'";
const LOGBOX_DISMISS_INSET = 24;

/**
 * Debug builds show a LogBox warning toast pinned to the bottom of the screen,
 * which covers bottom-aligned buttons such as Settings "Save". Tapping the toast
 * body opens the LogBox inspector, so tap its trailing dismiss button instead.
 */
async function dismissLogBoxToast(driver, isAndroid) {
  if (isAndroid) {
    return;
  }
  // XCUITest reports the toast twice (one copy hidden), so pick the displayed one.
  const toasts = await driver.$$(IOS_LOGBOX_TOAST);
  let toast;
  for (const candidate of toasts) {
    if (await candidate.isDisplayed().catch(() => false)) {
      toast = candidate;
      break;
    }
  }
  if (!toast) {
    return;
  }
  const { x, y, width, height } = await driver.getElementRect(
    await toast.elementId
  );
  await driver.execute('mobile: tap', {
    x: Math.round(x + width - LOGBOX_DISMISS_INSET),
    y: Math.round(y + height / 2),
  });
  await driver.pause(500);
}

module.exports = {
  byTestId,
  dismissLogBoxToast,
  waitForAny,
  tap,
  isAnyDisplayed,
};
