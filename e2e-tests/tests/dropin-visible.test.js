const { waitForAny, byTestId } = require('../helpers/elements');

const WAIT_TIMEOUT_MS = 120000;

function dropInButtonSelectors(isAndroid) {
  const testIdSelector = byTestId('dropin-button', isAndroid);
  return isAndroid
    ? [
        testIdSelector,
        // Label fallback; Android can render Button titles in upper case.
        'android=new UiSelector().textMatches("(?i)open\\s*drop\\s*in")',
      ]
    : [testIdSelector];
}

async function testDropInButtonVisible(driver, isAndroid) {
  await waitForAny(driver, dropInButtonSelectors(isAndroid), {
    timeout: WAIT_TIMEOUT_MS,
  });
  console.log("==> [Test] SUCCESS: 'Open DropIn' button is visible.");
  return true;
}

module.exports = { testDropInButtonVisible };
