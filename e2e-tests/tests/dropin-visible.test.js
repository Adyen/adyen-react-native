const { saveScreenshot, checkForRNErrors } = require('../helpers/utils');

const WAIT_TIMEOUT_MS = 120000;

async function testDropInButtonVisible(driver, isAndroid) {
  const selectors = isAndroid
    ? [
        'android=new UiSelector().textMatches("(?i).*drop\\s*in.*")',
        'android=new UiSelector().textContains("DROPIN")',
        '~dropin-button',
      ]
    : ['~dropin-button'];

  let dropInBtn;
  const startTime = Date.now();
  let lastErrorCheckAt = 0;

  while (Date.now() - startTime < WAIT_TIMEOUT_MS) {
    const now = Date.now();
    if (now - lastErrorCheckAt >= 5000) {
      await checkForRNErrors(driver, saveScreenshot);
      lastErrorCheckAt = now;
    }

    for (const btnSelector of selectors) {
      const candidate = await driver.$(btnSelector);
      const isDisplayed = await candidate.isDisplayed().catch(() => false);
      if (isDisplayed) {
        dropInBtn = candidate;
        break;
      }
    }

    if (dropInBtn) {
      break;
    }

    await driver.pause(2000);
  }

  if (!dropInBtn) {
    throw new Error(
      `element (${JSON.stringify(selectors)}) still not displayed after ${WAIT_TIMEOUT_MS}ms`
    );
  }

  console.log("==> [Test] SUCCESS: 'Open DropIn' button is visible.");
  return true;
}

module.exports = { testDropInButtonVisible };
