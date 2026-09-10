// Adyen's well-known public test card. Always Authorised in the test environment; no real
// payment data. https://docs.adyen.com/development-resources/testing/test-card-numbers/
const TEST_CARD = {
  number: '4111111111111111',
  expiryDate: '0330',
  securityCode: '737',
};

/**
 * Fills the three plain-text fields of the native Adyen Card component (card number, expiry,
 * security code).
 *
 * On Android the component exposes no resource-id/accessibility-id, so fields are matched by
 * their stable on-screen order among all EditTexts in the current window. On iOS the native
 * AdyenCard component sets stable accessibility identifiers directly.
 *
 * Waits for the form to actually render first - the Card component is built asynchronously
 * (session/payment-methods setup) after navigation, so it isn't present immediately.
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
    // These are custom-formatted fields (grouping/masking as you type); setting one right after
    // another without focusing first can leak keystrokes into whichever field WDA left focused,
    // corrupting both. Click to focus each field explicitly and pause briefly after typing to
    // let its formatting/validation settle before moving on.
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

/**
 * Waits for and taps the Card component's own "Pay <amount>" submit button (amount/currency
 * vary per session). On iOS this is matched by its stable accessibility identifier rather than
 * its label text - other mounted payment methods (Apple Pay, Google Pay) also render buttons
 * whose titles begin with "Pay ", so a text-based match would be ambiguous.
 */
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
