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
  await apiOnlyTab.waitForDisplayed({ timeout: 45000 });
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

async function expectAnyStatus(driver, expected, timeout = 30000) {
  await driver.waitUntil(
    async () => {
      for (const value of expected) {
        if (await (await driver.$(statusId(driver, value))).isExisting()) {
          return true;
        }
      }
      return false;
    },
    {
      timeout,
      timeoutMsg: `None of these statuses appeared: ${expected.join(', ')}`,
    }
  );
}

async function clickControl(driver, id) {
  const control = await driver.$(testId(driver, id));
  if (!(await control.isDisplayed()) && driver.isIOS) {
    await driver.hideKeyboard().catch(() => undefined);
    if (!(await control.isDisplayed())) {
      await driver.execute('mobile: scroll', {
        direction: 'down',
        name: id,
      });
    }
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

async function expectEmbeddedCardAttached(driver) {
  const cardField = driver.isIOS
    ? await driver.$(
        '~AdyenCard.FormCardNumberContainerItem.numberItem.textField'
      )
    : await driver.$(
        'android=new UiSelector().className("android.widget.EditText")'
      );

  await cardField.waitForExist({ timeout: 15000 });
  await driver.waitUntil(async () => (await cardField.getSize()).height > 0, {
    timeout: 15000,
    timeoutMsg: 'Re-attached card view has no height',
  });
}

async function expectStandaloneActionVisible(driver) {
  const action = driver.isAndroid
    ? await driver.$('android=new UiSelector().text("Purchase Authentication")')
    : await driver.$('~Cancel');

  await action.waitForDisplayed({ timeout: 30000 });
}

// Modal sheets ignore a close tap that lands while they are still animating in.
async function tapUntilGone(element, failureMessage) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await element.click().catch(() => undefined);
    const closed = await element
      .waitForExist({ reverse: true, timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (closed) return;
  }
  throw new Error(failureMessage);
}

async function cancelIOSStandaloneAction(driver) {
  await tapUntilGone(
    await driver.$('~Cancel'),
    'The standalone action challenge did not close'
  );
}

async function expectCardPaymentVisible(driver) {
  const cardField = driver.isIOS
    ? await driver.$(
        '~AdyenCard.FormCardNumberContainerItem.numberItem.textField'
      )
    : await driver.$(
        'android=new UiSelector().className("android.widget.EditText")'
      );

  await cardField.waitForDisplayed({ timeout: 30000 });
}

async function dismissCardSheet(driver) {
  const dismiss = await driver.$(cardSheetDismissSelector(driver));
  await dismiss.waitForDisplayed({ timeout: 15000 });
  await tapUntilGone(dismiss, 'The card sheet did not close');
}

function cardSheetDismissSelector(driver) {
  return driver.isAndroid
    ? 'android=new UiSelector().text("\u2715")'
    : '~AdyenReactNative.ControllerSheet.cancel';
}

const CONTENTION_SAMPLES = 4;
const CONTENTION_SAMPLE_INTERVAL_MS = 500;

/**
 * Samples the owner's sheet across a ~2 s window while contention is in progress. On iOS the
 * busy status must coexist with the open sheet on every sample. Android's modal bottom sheet
 * hides the activity window from the accessibility tree (even with enableMultiWindows), so there
 * the sheet must stay open on every sample and the ordering is proven afterwards by
 * expectContenderRejectedWhileOwnerActive.
 */
async function expectContentionWhileOwnerActive(driver) {
  const ownerSheetOpen = async () =>
    (await driver.$(cardSheetDismissSelector(driver))).isDisplayed();
  const sampleReady = driver.isAndroid
    ? ownerSheetOpen
    : async () =>
        (await (
          await driver.$(statusId(driver, 'contention-operationBusy'))
        ).isExisting()) && (await ownerSheetOpen());
  await driver.waitUntil(sampleReady, {
    timeout: 15000,
    interval: 250,
    timeoutMsg: driver.isAndroid
      ? 'The contention owner sheet did not open'
      : 'contention-operationBusy did not appear while the owner sheet was open',
  });
  for (let sample = 1; sample <= CONTENTION_SAMPLES; sample += 1) {
    await driver.pause(CONTENTION_SAMPLE_INTERVAL_MS);
    if (!(await sampleReady())) {
      throw new Error(
        driver.isAndroid
          ? `Contention sample ${sample}: the owner sheet closed while contention was in progress`
          : `Contention sample ${sample}: busy status and owner sheet were not both present`
      );
    }
  }
  console.log(
    driver.isAndroid
      ? `==> [Test] Contention owner sheet stayed open across ${CONTENTION_SAMPLES} samples`
      : `==> [Test] contention-operationBusy stable with the owner sheet open across ${CONTENTION_SAMPLES} samples`
  );
}

/**
 * The route records when the contender settles and when the owner's terminal event arrives;
 * this label only appears when the contender was rejected before the owner operation ended.
 */
async function expectContenderRejectedWhileOwnerActive(driver) {
  const value = 'operationBusy-while-owner-active';
  const order = await driver.$(
    driver.isAndroid
      ? `android=new UiSelector().textStartsWith("${value} (")`
      : `~validation-contention-order-${value}`
  );
  await order.waitForExist({ timeout: 15000 });
  console.log(`==> [Test] Contention order: ${await order.getText()}`);
}

async function runHeadlessPayment(driver, routeId) {
  await openRoute(driver, routeId);
  await expectStatus(driver, 'headless-ready');
  await clickControl(driver, 'validation-start-headless');

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
  // The presenter must be attached before replacement can prove it becomes inactive; on iOS a
  // tap that lands while the card view is still attaching is dropped.
  await expectEmbeddedCardAttached(driver);

  await clickControl(driver, 'validation-replace-checkout');
  await expectStatus(driver, 'mounted-presenter-inactive');
  await expectOldPresenterInactive(driver);

  await clickControl(driver, 'validation-submit-stale');
  await expectStatus(driver, 'stale-submit-staleCheckout');

  // The stale commands invalidate an ACTIVE checkout twice (idempotent), then controller.submit,
  // createController, isAvailable and Drop-in on it all reject staleCheckout.
  await clickControl(driver, 'validation-start-fresh-checkout');
  await expectStatus(driver, 'fresh-checkout-ready');
  await clickControl(driver, 'validation-stale-commands');
  await expectStatus(driver, 'stale-commands-staleCheckout');
  await clickControl(driver, 'validation-start-fresh-checkout');
  await expectStatus(driver, 'fresh-checkout-ready');

  await clickControl(driver, 'validation-recycle-presenter');
  await expectStatus(driver, 'presenter-recycled');

  // After several mount/unmount cycles the same controller still re-attaches its native view.
  await clickControl(driver, 'validation-remount-presenter');
  await expectStatus(driver, 'presenter-remounted');
  await expectEmbeddedCardAttached(driver);
  // Re-rendering the same payment method twice yields the mounted controller instance.
  await clickControl(driver, 'validation-double-create');
  await expectStatus(driver, 'controller-idempotent');
  await clickControl(driver, 'validation-unmount-presenter');
  await expectStatus(driver, 'presenter-unmounted');
  await expectOldPresenterInactive(driver);
  await clickControl(driver, 'validation-remount-presenter');
  await expectStatus(driver, 'presenter-remounted');
  await expectEmbeddedCardAttached(driver);
  await clickControl(driver, 'validation-unmount-presenter');
  await expectStatus(driver, 'presenter-unmounted');
  await expectOldPresenterInactive(driver);

  await clickControl(driver, 'validation-cse');
  await expectStatus(driver, 'cse-encryption-and-validation-complete');

  await clickControl(driver, 'validation-start-action');
  await expectStandaloneActionVisible(driver);
  if (isAndroid) {
    await driver.back();
  } else {
    await cancelIOSStandaloneAction(driver);
  }
  await expectAnyStatus(driver, [
    'standalone-action-cancelled',
    'standalone-action-completed',
  ]);

  await clickControl(driver, 'validation-headless-contention');
  await expectContentionWhileOwnerActive(driver);
  await dismissCardSheet(driver);
  await expectStatus(driver, 'contention-operationBusy');
  await expectContenderRejectedWhileOwnerActive(driver);

  await clickControl(driver, 'validation-cleanup-contention');
  await expectStatus(driver, 'contention-owner-cleaned');

  // A stable completed-owner label proves no contender was queued or auto-started.
  await expectStatus(driver, 'contention-owner-cleaned', 2000);
  await clickControl(driver, 'validation-start-fresh-checkout');
  await expectStatus(driver, 'fresh-checkout-ready');
  await clickControl(driver, 'validation-start-fresh-headless');
  await expectCardPaymentVisible(driver);
  await dismissCardSheet(driver);
  await clickControl(driver, 'validation-exit');

  console.log(
    '==> [Test] SUCCESS: Lookup, headless outcomes, replacement, stale, contention, Action, and CSE controls are selector-driven.'
  );
}

module.exports = {
  testValidationRoutes,
  testId,
  statusId,
  openValidationRoutes,
  expectStatus,
  clickControl,
};
