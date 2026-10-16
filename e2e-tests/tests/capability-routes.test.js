const os = require('os');
const path = require('path');
const {
  fillCardDetails,
  tapPayButton,
  waitForResultCode,
  tapBackToHome,
  TEST_CARD,
} = require('../helpers/checkout');
const { saveScreenshot } = require('../helpers/utils');
const {
  testId,
  openValidationRoutes,
  expectStatus,
  clickControl,
} = require('./validation-routes.test');

// The contract pins five same-type giftcard instances; the live account may add more brands.
const MIN_GIFTCARD_COUNT = 5;
const ARTIFACT_DIR = process.env.E2E_ARTIFACT_DIR || os.tmpdir();

async function readText(driver, id) {
  const element = await driver.$(testId(driver, id));
  await element.waitForExist({ timeout: 15000 });
  return driver.isIOS ? element.getAttribute('label') : element.getText();
}

async function exitRoute(driver) {
  await scrollToId(driver, 'validation-exit');
  await clickControl(driver, 'validation-exit');
  await (
    await driver.$(testId(driver, 'validation-route-menu'))
  ).waitForExist({ timeout: 15000 });
}

// UiAutomator only exposes on-screen nodes, so Android scrolls the entry into view first.
async function scrollToId(driver, id) {
  if (!driver.isAndroid) return;
  await driver.hideKeyboard().catch(() => undefined);
  if (await (await driver.$(testId(driver, id))).isExisting()) return;
  await driver
    .$(
      `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("${id}"))`
    )
    .catch(() => undefined);
}

async function openCapabilityRoute(driver, id) {
  await scrollToId(driver, id);
  await clickControl(driver, id);
}

async function expectEntryRendered(driver, id) {
  await scrollToId(driver, id);
  await (await driver.$(testId(driver, id))).waitForExist({ timeout: 15000 });
}

async function bounds(driver, id) {
  const element = await driver.$(testId(driver, id));
  await element.waitForExist({ timeout: 15000 });
  const [location, size] = await Promise.all([
    element.getLocation(),
    element.getSize(),
  ]);
  return { ...location, ...size };
}

/**
 * Lists every giftcard instance of the live checkout: five distinct entries with unique ids,
 * each either an exact-instance controller or unavailable with unsupportedCapability. iOS
 * cannot build giftcard components at the pinned SDK version, so every entry is unavailable.
 */
async function testGiftcardInstances(driver) {
  await openCapabilityRoute(driver, 'validation-route-giftcards');
  await expectStatus(driver, 'giftcards-verified', 60000);
  const summary = await readText(driver, 'validation-detail-0');
  console.log(`==> [Test] Giftcard capability: ${summary}`);

  const count = Number(/count=(\d+)/.exec(summary)?.[1] ?? 0);
  if (count < MIN_GIFTCARD_COUNT) {
    throw new Error(
      `Expected at least ${MIN_GIFTCARD_COUNT} giftcard entries, got ${count}`
    );
  }
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    rows.push(await readText(driver, `validation-giftcard-${index}`));
  }
  const extra = await driver.$(testId(driver, `validation-giftcard-${count}`));
  if (await extra.isExisting()) {
    throw new Error(`Expected exactly ${count} giftcard entries`);
  }
  const entries = rows.map((row) => {
    const [id, brand, availability, outcome] = row.split('|');
    return { id, brand, availability, outcome };
  });
  entries.forEach((entry) =>
    console.log(
      `==> [Test] giftcard ${entry.brand} id=${entry.id} ${entry.availability} ${entry.outcome}`
    )
  );
  if (new Set(entries.map((entry) => entry.id)).size !== count) {
    throw new Error('Giftcard entries do not have unique ids');
  }
  for (const entry of entries) {
    const expected =
      entry.availability === 'available'
        ? 'exact-controller'
        : 'unsupportedCapability';
    if (entry.outcome !== expected) {
      throw new Error(
        `Giftcard ${entry.id} is ${entry.availability} but ended ${entry.outcome}`
      );
    }
  }
  if (
    driver.isIOS &&
    entries.some((entry) => entry.availability !== 'unavailable')
  ) {
    throw new Error('The pinned iOS SDK cannot build giftcard components');
  }

  // The shared list component keeps every instance listed, unavailable ones as disabled rows.
  for (const entry of entries) {
    await expectEntryRendered(driver, `payment-method-${entry.id}`);
  }
  await saveScreenshot(
    driver,
    path.join(
      ARTIFACT_DIR,
      `capability-giftcards-${driver.isAndroid ? 'android' : 'ios'}.png`
    )
  );
  await exitRoute(driver);
}

async function expectControllerContent(driver, index, minimumHeight) {
  const id = `validation-mounted-${index}`;
  await scrollToId(driver, id);
  const box = await bounds(driver, id);
  if (box.height <= minimumHeight) {
    throw new Error(`Controller view ${index} did not render content`);
  }
  if (driver.isAndroid) {
    const input = await driver.$(
      `android=new UiSelector().resourceId("${id}").childSelector(new UiSelector().className("android.widget.EditText"))`
    );
    await input.waitForExist({ timeout: 15000 });
  }
  return box;
}

/** Mounts a card controller and a second supported controller with its own view. */
async function testMultiMount(driver) {
  await openCapabilityRoute(driver, 'validation-route-multi-mount');
  await expectStatus(driver, 'multi-mount-ready', 60000);
  console.log(
    `==> [Test] Mounted together: ${await readText(driver, 'validation-detail-0')}`
  );
  const minimumHeight =
    (await bounds(driver, 'validation-mounted-type-0')).height * 2;
  await expectControllerContent(driver, 0, minimumHeight);
  const second = await expectControllerContent(driver, 1, minimumHeight);
  const firstElement = await driver.$(testId(driver, 'validation-mounted-0'));
  if (await firstElement.isExisting()) {
    const first = await bounds(driver, 'validation-mounted-0');
    // Layout rounding can make adjacent views share their boundary pixel.
    if (first.y + first.height > second.y + 1) {
      throw new Error('The two controller views overlap');
    }
  }
  await exitRoute(driver);
}

async function payWithStoredCard(driver) {
  if (driver.isIOS) {
    const securityCode = await driver.$(
      '~AdyenCard.StoredCardInputViewModel.securityCodeItem.textField'
    );
    await securityCode.waitForDisplayed({ timeout: 30000 });
    await securityCode.click();
    await securityCode.setValue(TEST_CARD.securityCode);
    const pay = await driver.$(
      '-ios predicate string:name ENDSWITH ".primaryButton"'
    );
    await pay.waitForDisplayed({ timeout: 15000 });
    await pay.click();
    return;
  }
  const field = await driver.$('android.widget.EditText');
  await field.waitForDisplayed({ timeout: 30000 });
  await field.setValue(TEST_CARD.securityCode);
  await tapPayButton(driver);
}

/**
 * Stores a card through a real card payment with the store flag, then pays with the stored
 * entry of a fresh checkout through its own controller.
 */
async function testStoredController(driver) {
  await openCapabilityRoute(driver, 'validation-route-stored');
  await expectStatus(driver, 'stored-store-ready', 60000);
  await fillCardDetails(driver);
  await tapPayButton(driver);
  await expectStatus(driver, 'stored-card-saved', 90000);

  await scrollToId(driver, 'validation-stored-load');
  await clickControl(driver, 'validation-stored-load');
  await expectStatus(driver, 'stored-controller-ready', 60000);
  console.log(
    `==> [Test] Fresh checkout: ${await readText(driver, 'validation-detail-0')}`
  );
  await payWithStoredCard(driver);
  const resultCode = await waitForResultCode(driver, 90000);
  if (!/authorised/i.test(resultCode)) {
    throw new Error(
      `Expected an Authorised stored payment, got "${resultCode}"`
    );
  }
  await tapBackToHome(driver);
}

/**
 * The live account offers no method that completes without external UI, so the route records
 * the no-input candidates and is skipped by environment; native unit tests cover the path.
 */
async function testAutoSubmit(driver) {
  await openCapabilityRoute(driver, 'validation-route-auto-submit');
  await expectStatus(driver, 'auto-submit-skipped-by-environment', 60000);
  console.log(
    `==> [Test] Auto-submit skipped by environment (${await readText(driver, 'validation-detail-0')})`
  );
  await exitRoute(driver);
}

async function testCapabilityRoutes(driver, _isAndroid) {
  await openValidationRoutes(driver);
  await testGiftcardInstances(driver);
  await testMultiMount(driver);
  await testAutoSubmit(driver);
  await testStoredController(driver);

  console.log(
    '==> [Test] SUCCESS: Giftcard instances, multi-mount, auto-submit capability, and stored controller payment.'
  );
}

module.exports = { testCapabilityRoutes };
