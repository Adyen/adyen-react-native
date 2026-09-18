// Adyen's public test card. Always Authorised in the test environment; no real payment data.
const TEST_CARD = {
  number: '4111111111111111',
  expiryDate: '0330',
  securityCode: '737',
};

/**
 * Fills the card number, expiry and security code fields. Android matches fields by on-screen
 * order (no accessibility-id); iOS uses stable accessibility identifiers.
 */
async function fillCardDetails(driver, card = TEST_CARD, timeout = 20000) {
  if (driver.isIOS) {
    const numberField = await driver.$(
      '~AdyenCard.FormCardNumberContainerItem.numberItem.textField'
    );
    const expiryField = await driver.$(
      '~AdyenCard.CardComponent.expiryDateItem.textField'
    );
    const securityCodeField = await driver.$(
      '~AdyenCard.CardComponent.securityCodeItem.textField'
    );
    await numberField.waitForDisplayed({ timeout });
    // Focus each field explicitly and pause after typing, or keystrokes can leak between fields.
    for (const [field, value] of [
      [numberField, card.number],
      [expiryField, card.expiryDate],
      [securityCodeField, card.securityCode],
    ]) {
      await field.click();
      await field.setValue(value);
      await driver.pause(500);
    }
    return;
  }

  const deadline = Date.now() + timeout;
  let fields = [];
  while (Date.now() < deadline) {
    fields = await driver.$$('android.widget.EditText');
    if (fields.length >= 3) break;
    await driver.pause(500);
  }
  if (fields.length < 3) {
    throw new Error(
      `Timed out waiting for the card form (found ${fields.length} EditText fields, expected >= 3)`
    );
  }
  await fields[0].setValue(card.number);
  await fields[1].setValue(card.expiryDate);
  await fields[2].setValue(card.securityCode);
}

/** Waits for and taps the Card component's "Pay" button (matched by id on iOS to avoid ambiguity with other payment buttons). */
async function tapPayButton(driver, timeout = 15000) {
  const payButton = driver.isIOS
    ? await driver.$('~AdyenCard.CardComponent.payButtonItem.button')
    : await driver.$('android=new UiSelector().textMatches("(?i)^pay .*")');
  await payButton.waitForDisplayed({ timeout });
  await payButton.click();
}

/** Waits for the Result screen and returns its resultCode text. */
async function waitForResultCode(driver, timeout = 30000) {
  const resultText = driver.isIOS
    ? await driver.$('~result-code')
    : await driver.$('android=new UiSelector().resourceId("result-code")');
  await resultText.waitForDisplayed({ timeout });
  return driver.isIOS ? resultText.getAttribute('label') : resultText.getText();
}

/** Waits for and taps the "Back to Home" button on the Result screen. */
async function tapBackToHome(driver, timeout = 10000) {
  const backButton = driver.isIOS
    ? await driver.$('-ios predicate string:label CONTAINS[c] "back to home"')
    : await driver.$(
        'android=new UiSelector().textMatches("(?i).*back to home.*")'
      );
  await backButton.waitForDisplayed({ timeout });
  await backButton.click();
}

module.exports = {
  TEST_CARD,
  fillCardDetails,
  tapPayButton,
  waitForResultCode,
  tapBackToHome,
};
