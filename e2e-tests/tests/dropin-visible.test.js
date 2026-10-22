const { waitForAny, tap, byTestId } = require('../helpers/elements');

const WAIT_TIMEOUT_MS = 120000;

function dropInButtonSelectors(isAndroid) {
  const testIdSelector = byTestId('dropin-button', isAndroid);
  return isAndroid
    ? [
        testIdSelector,
        // Full-match regexes so the "Sessions DropIn" menu entry and header never match.
        'android=new UiSelector().textMatches("(?i)(open\\s*)?drop\\s*-?\\s*in")',
      ]
    : [testIdSelector];
}

/**
 * Navigates to the screen holding the Drop-in button. The example app reaches
 * it through the "Sessions DropIn" menu entry; the CI fixture app renders it
 * directly on launch.
 */
async function openDropInScreen(driver, isAndroid) {
  const sessionsDropInMenu = byTestId('menu-sessions-dropin', isAndroid);
  const dropInSelectors = dropInButtonSelectors(isAndroid);
  const { selector } = await waitForAny(
    driver,
    [sessionsDropInMenu, ...dropInSelectors],
    { timeout: WAIT_TIMEOUT_MS }
  );

  if (selector === sessionsDropInMenu) {
    await tap(driver, sessionsDropInMenu);
  }

  const { element } = await waitForAny(driver, dropInSelectors, {
    timeout: WAIT_TIMEOUT_MS,
  });
  return element;
}

async function testDropInButtonVisible(driver, isAndroid) {
  await openDropInScreen(driver, isAndroid);
  console.log("==> [Test] SUCCESS: 'Drop-in' button is visible.");
  return true;
}

module.exports = {
  testDropInButtonVisible,
  openDropInScreen,
  dropInButtonSelectors,
};
