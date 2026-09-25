const {
  fillCardDetails,
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

async function openValidationRoutes(driver) {
  const apiOnlyTab = await driver.$(testId(driver, 'tab-API-Only'));
  await apiOnlyTab.waitForDisplayed({ timeout: 45000 });
  await apiOnlyTab.click();

  const validationMenu = await driver.$(
    testId(driver, 'menu-item-ValidationRoutes')
  );
  await validationMenu.waitForDisplayed({ timeout: 15000 });
  await validationMenu.click();
}

async function openRoute(driver, route) {
  const control = await driver.$(testId(driver, route));
  await control.waitForDisplayed({ timeout: 15000 });
  await control.click();
}

async function expectStatus(driver, status, timeout = 30000) {
  const control = await driver.$(statusId(driver, status));
  await control.waitForExist({ timeout });
}

async function clickControl(driver, id) {
  const control = await driver.$(testId(driver, id));
  await control.waitForDisplayed({ timeout: 15000 });
  await control.click();
}

async function tapAndroidDropInPay(driver) {
  await driver.execute('mobile: performEditorAction', { action: 'done' });
  await driver.hideKeyboard().catch(() => undefined);
  const control = await driver.$(
    'android=new UiSelector().className("android.view.View").clickable(true).enabled(true).childSelector(new UiSelector().textMatches("(?i)^pay .*"))'
  );
  await control.waitForDisplayed({ timeout: 15000 });
  await control.click();
}

async function runAndroidDropIn(driver, route) {
  await openRoute(driver, route);
  await expectStatus(driver, 'dropin-ready');
  await clickControl(driver, 'validation-start-dropin');
  const otherPaymentMethods = await driver.$(
    'android=new UiSelector().text("Other payment methods")'
  );
  await otherPaymentMethods.waitForDisplayed({ timeout: 30000 });
  await otherPaymentMethods.click();
  const card = await driver.$('android=new UiSelector().text("Credit Card")');
  await card.waitForDisplayed({ timeout: 30000 });
  await card.click();
  await fillCardDetails(driver);
  await tapAndroidDropInPay(driver);

  const resultCode = await waitForResultCode(driver);
  if (!/authorised/i.test(resultCode)) {
    throw new Error(
      `Expected an Authorised Drop-in result for ${route}, got "${resultCode}"`
    );
  }
  await tapBackToHome(driver);
}

async function assertAndroidUnsupportedDropIn(driver) {
  await openRoute(driver, 'validation-route-dropin-advanced');
  await expectStatus(driver, 'dropin-ready');
  await clickControl(driver, 'validation-start-dropin');
  await expectStatus(driver, 'dropin-unsupportedCapability-presentation');

  const start = await driver.$(testId(driver, 'validation-start-dropin'));
  await start.waitForDisplayed({ timeout: 15000 });

  for (const selector of [
    'android=new UiSelector().text("Other payment methods")',
    'android=new UiSelector().text("Credit Card")',
  ]) {
    if (await (await driver.$(selector)).isDisplayed().catch(() => false)) {
      throw new Error(`Unsupported Android Drop-in showed UI: ${selector}`);
    }
  }
}

async function assertAndroidUnsupportedLookup(driver) {
  await openRoute(driver, 'validation-route-address-lookup');
  await expectStatus(driver, 'setup-unsupportedCapability');

  for (const selector of [
    'android=new UiSelector().textContains("Search for your address")',
    'android=new UiSelector().textContains("Postal")',
    'android=new UiSelector().textContains("Address")',
  ]) {
    if (await (await driver.$(selector)).isDisplayed().catch(() => false)) {
      throw new Error(
        `Unsupported Android lookup showed fallback UI: ${selector}`
      );
    }
  }

  await clickControl(driver, 'validation-exit-unsupported-lookup');
  await openRoute(driver, 'validation-route-headless-sessions');
  await expectStatus(driver, 'headless-ready');
  await clickControl(driver, 'validation-start-headless');
  const cardField = await driver.$(
    'android=new UiSelector().className("android.widget.EditText")'
  );
  await cardField.waitForDisplayed({ timeout: 30000 });
  const dismiss = await driver.$('android=new UiSelector().text("\u2715")');
  await dismiss.waitForDisplayed({ timeout: 15000 });
  await dismiss.click();
}

async function assertIOSUnsupportedDropIn(driver) {
  await openRoute(driver, 'validation-route-dropin-sessions');
  await expectStatus(driver, 'dropin-ready');
  await clickControl(driver, 'validation-start-dropin');
  await expectStatus(driver, 'dropin-unsupportedCapability-presentation');

  const start = await driver.$(testId(driver, 'validation-start-dropin'));
  await start.waitForDisplayed({ timeout: 15000 });
  const cardField = await driver.$(
    '~AdyenCard.FormCardNumberContainerItem.numberItem.textField'
  );
  if (await cardField.isDisplayed().catch(() => false)) {
    throw new Error('Unsupported iOS Drop-in showed a card UI');
  }
}

async function testDropInAndUnsupportedFlows(driver, isAndroid) {
  await openValidationRoutes(driver);

  if (isAndroid) {
    await runAndroidDropIn(driver, 'validation-route-dropin-sessions');
    await openValidationRoutes(driver);
    await assertAndroidUnsupportedDropIn(driver);
    await clickControl(driver, 'validation-exit');
    await clickControl(driver, 'validation-route-exit');
    await openValidationRoutes(driver);
    await assertAndroidUnsupportedLookup(driver);
    console.log(
      '==> [Test] SUCCESS: Android session Drop-in authorised; advanced Drop-in and lookup stayed unsupported without fallback UI.'
    );
    return;
  }

  await assertIOSUnsupportedDropIn(driver);
  console.log(
    '==> [Test] SUCCESS: iOS Drop-in stayed unsupported with no presented UI.'
  );
}

module.exports = { testDropInAndUnsupportedFlows };
