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

async function openValidationRoutes(driver) {
  const apiOnlyTab = await driver.$(testId(driver, 'tab-API-Only'));
  await apiOnlyTab.waitForDisplayed({ timeout: 15000 });
  await apiOnlyTab.click();

  const validationMenu = await driver.$(
    testId(driver, 'menu-item-ValidationRoutes')
  );
  await validationMenu.waitForDisplayed({ timeout: 15000 });
  await validationMenu.click();
}

async function expectStatus(driver, expected, timeout = 30000) {
  const status = await driver.$(statusId(driver, expected));
  await status.waitForExist({ timeout });
}

async function clickControl(driver, id) {
  const control = await driver.$(testId(driver, id));
  if (!(await control.isDisplayed()) && driver.isIOS) {
    await driver.execute('mobile: scroll', {
      direction: 'down',
      name: id,
    });
  } else if (!(await control.isDisplayed())) {
    await control.scrollIntoView({ direction: 'down' });
  }
  await control.waitForDisplayed({ timeout: 15000 });
  await control.click();
}

async function openRoute(driver, id) {
  const route = await driver.$(testId(driver, id));
  await route.waitForDisplayed({ timeout: 15000 });
  await route.click();
}

async function expectOldPresenterInactive(driver) {
  const oldCardField = driver.isIOS
    ? await driver.$(
        '~AdyenCard.FormCardNumberContainerItem.numberItem.textField'
      )
    : await driver.$(
        'android=new UiSelector().className("android.widget.EditText")'
      );

  await oldCardField.waitForExist({ reverse: true, timeout: 15000 });
}

async function runHeadlessPayment(driver, routeId) {
  await openRoute(driver, routeId);
  await expectStatus(driver, 'headless-ready');
  await clickControl(driver, 'validation-start-headless');
  await expectStatus(driver, 'headless-started');

  await fillCardDetails(driver);
  await tapPayButton(driver);
  const resultCode = await waitForResultCode(driver);
  if (!/authorised/i.test(resultCode)) {
    throw new Error(
      `Expected an Authorised headless result, got "${resultCode}"`
    );
  }
  await tapBackToHome(driver);
}

/**
 * Exercises the example-only lifecycle and standalone controls entirely through accessibility
 * selectors. The iOS lookup flow uses the SDK's stable accessibility labels and route state
 * labels, never coordinates, to prove that the correlated search and confirmation callbacks run
 * before the real card payment completes.
 */
async function testValidationRoutes(driver, isAndroid) {
  await openValidationRoutes(driver);

  if (!isAndroid) {
    const lookupRoute = await driver.$(
      testId(driver, 'validation-route-address-lookup')
    );
    await lookupRoute.waitForDisplayed({ timeout: 15000 });
    await lookupRoute.click();
    await expectStatus(driver, 'lookup-ready');

    // The iOS Card Component supplies these published accessibility identifiers.
    await fillCardDetails(driver);
    const address = await driver.$('~AdyenCard.CardComponent.billingAddress');
    await address.waitForDisplayed({ timeout: 30000 });
    await address.click();

    const lookupField = await driver.$('~Search for your address');
    await lookupField.waitForDisplayed({ timeout: 30000 });
    await lookupField.addValue('Damrak');
    await driver.keys('Return');
    await expectStatus(driver, 'lookup-query-received');

    const candidate = await driver.$(
      '-ios predicate string:label CONTAINS "Damrak"'
    );
    await candidate.waitForDisplayed({ timeout: 30000 });
    await candidate.click();
    await expectStatus(driver, 'lookup-candidate-confirmed');

    const confirmAddress = await driver.$('~Done');
    await confirmAddress.waitForDisplayed({ timeout: 30000 });
    await confirmAddress.click();

    await tapPayButton(driver);
    const lookupResult = await waitForResultCode(driver);
    if (!/authorised/i.test(lookupResult)) {
      throw new Error(
        `Expected the address lookup payment to be Authorised, got "${lookupResult}"`
      );
    }
    await tapBackToHome(driver);
    await openValidationRoutes(driver);
  }

  await runHeadlessPayment(driver, 'validation-route-headless-sessions');
  await openValidationRoutes(driver);
  await runHeadlessPayment(driver, 'validation-route-headless-advanced');
  await openValidationRoutes(driver);

  await openRoute(driver, 'validation-route-lifecycle');
  await expectStatus(driver, 'embedded-ready');

  await clickControl(driver, 'validation-replace-checkout');
  await expectStatus(driver, 'mounted-presenter-inactive');
  await expectOldPresenterInactive(driver);

  await clickControl(driver, 'validation-submit-stale');
  await expectStatus(driver, 'stale-submit-staleCheckout');

  await clickControl(driver, 'validation-recycle-presenter');
  await expectStatus(driver, 'presenter-recycled');

  await clickControl(driver, 'validation-cse');
  await expectStatus(driver, 'cse-encryption-and-validation-complete');

  await clickControl(driver, 'validation-start-action');
  await expectStatus(driver, 'standalone-action-active');
  if (isAndroid) {
    await driver.back();
  } else {
    await clickControl(driver, 'validation-action-cancel');
  }
  await expectStatus(driver, 'standalone-action-cancelled');

  await clickControl(driver, 'validation-headless-contention');
  if (isAndroid) {
    await driver.back();
  }
  await expectStatus(driver, 'contention-operationBusy');

  await clickControl(driver, 'validation-cleanup-contention');
  await expectStatus(driver, 'contention-owner-cleaned');

  // A stable completed-owner label proves no contender was queued or auto-started.
  await expectStatus(driver, 'contention-owner-cleaned', 2000);
  await clickControl(driver, 'validation-start-fresh-checkout');
  await expectStatus(driver, 'fresh-checkout-ready');
  await clickControl(driver, 'validation-start-fresh-headless');
  await expectStatus(driver, 'fresh-headless-started');
  if (isAndroid) {
    await driver.back();
  }

  if (isAndroid) {
    await clickControl(driver, 'validation-exit');
  }

  console.log(
    '==> [Test] SUCCESS: Lookup, headless outcomes, replacement, stale, contention, Action, and CSE controls are selector-driven.'
  );
}

module.exports = { testValidationRoutes };
