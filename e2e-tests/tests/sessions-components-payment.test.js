const {
  fillCardDetails,
  tapPayButton,
  waitForResultCode,
  tapBackToHome,
} = require('../helpers/checkout');

function testId(driver, id) {
  return driver.isAndroid
    ? `android=new UiSelector().resourceId("${id}")`
    : `~${id}`;
}

function statusId(driver, status) {
  return driver.isAndroid
    ? `android=new UiSelector().text("${status}")`
    : `~validation-status-${status}`;
}

/**
 * Full card payment through Sessions Components (AdyenCheckout.setup() + embedded
 * <AdyenComponent type="scheme">), against the real example app. Runs on both Android and iOS.
 */
async function testSessionsComponentsPayment(driver, _isAndroid) {
  const apiOnlyTab = await driver.$(testId(driver, 'tab-API-Only'));
  await apiOnlyTab.waitForDisplayed({ timeout: 15000 });
  await apiOnlyTab.click();

  const validationMenu = await driver.$(
    testId(driver, 'menu-item-ValidationRoutes')
  );
  await validationMenu.waitForDisplayed({ timeout: 15000 });
  await validationMenu.click();

  const sessionRoute = await driver.$(
    testId(driver, 'validation-route-sessions')
  );
  await sessionRoute.waitForDisplayed({ timeout: 15000 });
  await sessionRoute.click();

  const status = await driver.$(statusId(driver, 'embedded-ready'));
  await status.waitForExist({ timeout: 30000 });

  await fillCardDetails(driver);
  await tapPayButton(driver);

  const resultCode = await waitForResultCode(driver);
  if (!/authorised/i.test(resultCode)) {
    throw new Error(`Expected an Authorised result, got "${resultCode}"`);
  }

  await tapBackToHome(driver);

  console.log(
    '==> [Test] SUCCESS: Sessions Components card payment Authorised.'
  );
  return true;
}

module.exports = { testSessionsComponentsPayment };
