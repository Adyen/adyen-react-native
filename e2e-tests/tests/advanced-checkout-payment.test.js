const {
  fillCardDetails,
  tapPayButton,
  waitForResultCode,
  tapBackToHome,
} = require('../helpers/checkout');

/**
 * Full card payment through Advanced Checkout (AdyenCheckout.setupAdvanced() + embedded
 * <AdyenComponent type="scheme">), against the real example app. Runs on both Android and iOS.
 */
async function testAdvancedCheckoutPayment(driver, _isAndroid) {
  const advancedTab = await driver.$('~tab-Advanced');
  await advancedTab.waitForDisplayed({ timeout: 15000 });
  await advancedTab.click();

  const menuItem = await driver.$('~menu-item-AdvancedCheckout');
  await menuItem.waitForDisplayed({ timeout: 15000 });
  await menuItem.click();

  await fillCardDetails(driver);
  await tapPayButton(driver);

  const resultCode = await waitForResultCode(driver);
  if (!/authorised/i.test(resultCode)) {
    throw new Error(`Expected an Authorised result, got "${resultCode}"`);
  }

  await tapBackToHome(driver);

  console.log('==> [Test] SUCCESS: Advanced Checkout card payment Authorised.');
  return true;
}

module.exports = { testAdvancedCheckoutPayment };
