const {
  fillCardDetails,
  tapPayButton,
  waitForResultCode,
  tapBackToHome,
} = require('../helpers/checkout');

/**
 * Full card payment through Sessions Components (AdyenCheckout.setup() + embedded
 * <AdyenComponent type="scheme">), against the real example app. Runs on both Android and iOS.
 */
async function testSessionsComponentsPayment(driver, _isAndroid) {
  const apiOnlyTab = await driver.$('~tab-API-Only');
  await apiOnlyTab.waitForDisplayed({ timeout: 15000 });
  await apiOnlyTab.click();

  const validationMenu = await driver.$('~menu-item-ValidationRoutes');
  await validationMenu.waitForDisplayed({ timeout: 15000 });
  await validationMenu.click();

  const sessionRoute = await driver.$('~validation-route-sessions');
  await sessionRoute.waitForDisplayed({ timeout: 15000 });
  await sessionRoute.click();

  const status = await driver.$('~validation-status');
  await driver.waitUntil(
    async () => (await status.getText()) === 'embedded-ready',
    {
      timeout: 30000,
      timeoutMsg: 'Expected the sessions embedded presenter to become ready',
    }
  );

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
