const {
  waitForAny,
  tap,
  isAnyDisplayed,
  byTestId,
  dismissLogBoxToast,
} = require('../helpers/elements');
const { saveScreenshot } = require('../helpers/utils');
const { restartApp } = require('../helpers/app');
const { openDropInScreen } = require('./dropin-visible.test');

const LAUNCH_TIMEOUT_MS = 120000;
const PAYMENT_TIMEOUT_MS = 90000;

const HOME_TAB_IDS = ['tab-sessions', 'tab-advanced', 'tab-api-only'];
const SESSIONS_MENU_IDS = ['menu-sessions-dropin', 'menu-sessions-components'];

// Adyen sandbox test card that completes without a 3DS challenge.
const TEST_CARD = {
  number: '4111111111111111',
  expiryDate: '0330',
  securityCode: '737',
};
// The Sessions flow shows the session status reported by
// GET /sessions/{id}, which is "completed" once the payment is authorised.
const AUTHORISED_CLASS_CODES = ['Authorised', 'Received', 'completed'];
const INVALID_MERCHANT_ACCOUNT = 'E2EInvalidMerchantAccount';

// Native Drop-in sheet elements carry no JS testIDs; these are the
// accessibility identifiers assigned by the Adyen iOS SDK.
const IOS_DROPIN = {
  openAllButton:
    '~AdyenDropIn.PreselectedPaymentMethodComponent.openAllButton.button',
  cardListItem: [
    '~AdyenDropIn.PaymentMethodListComponent.Credit Card.itemView',
    "-ios predicate string:name BEGINSWITH 'AdyenDropIn.PaymentMethodListComponent.' AND name ENDSWITH '.itemView' AND label CONTAINS[c] 'card' AND NOT label CONTAINS[c] 'gift' AND NOT label CONTAINS 'Last 4 digits'",
  ],
  cardNumber: '~AdyenCard.FormCardNumberContainerItem.numberItem.textField',
  expiryDate: '~AdyenCard.CardComponent.expiryDateItem.textField',
  securityCode: '~AdyenCard.CardComponent.securityCodeItem.textField',
  payButton: '~AdyenCard.CardComponent.payButtonItem.button',
  backButton: ['~BackButton', '~Home'],
};

async function testLaunchShowsHome(driver, isAndroid) {
  const ids = [...HOME_TAB_IDS, ...SESSIONS_MENU_IDS];
  for (const id of ids) {
    await waitForAny(driver, byTestId(id, isAndroid), {
      timeout: LAUNCH_TIMEOUT_MS,
    });
  }
  await waitForAny(driver, byTestId('settings-button', isAndroid));
  console.log(
    `==> [Test] SUCCESS: Home is visible (${ids.join(', ')}, settings-button).`
  );
}

async function fillField(driver, selector, value) {
  const { element } = await waitForAny(driver, selector, { timeout: 30000 });
  await element.click();
  await element.setValue(value);
}

async function testSessionsDropInPayment(driver, isAndroid) {
  if (isAndroid) {
    console.log(
      '==> [Test] SKIP: Sessions DropIn payment uses iOS-native sheet selectors.'
    );
    return;
  }

  const dropInButton = await openDropInScreen(driver, isAndroid);
  await dropInButton.click();

  const { selector } = await waitForAny(
    driver,
    [IOS_DROPIN.openAllButton, ...IOS_DROPIN.cardListItem],
    { timeout: 60000 }
  );
  await saveScreenshot(driver, './appium_dropin_sheet.png');
  if (selector === IOS_DROPIN.openAllButton) {
    await tap(driver, IOS_DROPIN.openAllButton);
  }
  await tap(driver, IOS_DROPIN.cardListItem, { timeout: 30000 });

  await fillField(driver, IOS_DROPIN.cardNumber, TEST_CARD.number);
  await fillField(driver, IOS_DROPIN.expiryDate, TEST_CARD.expiryDate);
  await fillField(driver, IOS_DROPIN.securityCode, TEST_CARD.securityCode);
  await tap(driver, IOS_DROPIN.payButton);

  const { element: resultCode } = await waitForAny(driver, '~result-code', {
    timeout: PAYMENT_TIMEOUT_MS,
  });
  const code = (await resultCode.getText()).trim();
  await saveScreenshot(driver, './appium_dropin_result.png');

  if (!AUTHORISED_CLASS_CODES.includes(code)) {
    throw new Error(
      `Expected result code in ${JSON.stringify(AUTHORISED_CLASS_CODES)}, got "${code}"`
    );
  }
  console.log(`==> [Test] SUCCESS: Sessions DropIn payment result "${code}".`);
}

async function setMerchantAccount(driver, isAndroid, value) {
  await tap(driver, byTestId('settings-button', isAndroid), {
    timeout: LAUNCH_TIMEOUT_MS,
  });
  const { element: field } = await waitForAny(
    driver,
    byTestId('settings-merchant-account', isAndroid)
  );
  const previous = await field.getText();
  await field.clearValue();
  // The trailing newline submits the field so the keyboard no longer covers Save.
  await field.setValue(`${value}\n`);
  await dismissLogBoxToast(driver, isAndroid);
  await tap(driver, byTestId('settings-save-button', isAndroid));
  await waitForAny(driver, byTestId('menu-sessions-dropin', isAndroid));
  return previous;
}

async function testSessionsDropInErrorPath(driver, isAndroid) {
  const originalMerchantAccount = await setMerchantAccount(
    driver,
    isAndroid,
    INVALID_MERCHANT_ACCOUNT
  );

  try {
    await tap(driver, byTestId('menu-sessions-dropin', isAndroid));
    const { element: errorText } = await waitForAny(
      driver,
      byTestId('checkout-error', isAndroid),
      { timeout: 60000 }
    );
    const message = (await errorText.getText()).trim();
    if (!message) {
      throw new Error('Inline checkout error is empty');
    }
    if (await isAnyDisplayed(driver, byTestId('dropin-button', isAndroid))) {
      throw new Error('Drop-in button is shown despite the session error');
    }
    await saveScreenshot(driver, './appium_error_path.png');

    if (isAndroid) {
      await driver.back();
    } else {
      await tap(driver, IOS_DROPIN.backButton);
    }
    await waitForAny(driver, byTestId('menu-sessions-dropin', isAndroid));
    console.log(
      '==> [Test] SUCCESS: Broken credentials show an inline error; app stays navigable.'
    );
  } finally {
    await restartApp(driver);
    await setMerchantAccount(driver, isAndroid, originalMerchantAccount);
  }
}

module.exports = {
  testLaunchShowsHome,
  testSessionsDropInPayment,
  testSessionsDropInErrorPath,
};
