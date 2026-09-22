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
  const menuItem = await driver.$('~menu-item-SessionsComponentsCheckout');
  await menuItem.waitForDisplayed({ timeout: 15000 });
  await menuItem.click();

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
