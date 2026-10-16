const { checkForRNErrors, saveScreenshot } = require('../helpers/utils');

function testId(driver, id) {
  return driver.isAndroid
    ? `android=new UiSelector().resourceId("${id}")`
    : `~${id}`;
}

function textExactly(driver, text) {
  return driver.isAndroid
    ? `android=new UiSelector().textMatches("(?i)^${text}$")`
    : `-ios predicate string:label ==[c] "${text}"`;
}

function textContaining(driver, text) {
  return driver.isAndroid
    ? `android=new UiSelector().textContains("${text}")`
    : `-ios predicate string:label CONTAINS[c] "${text}"`;
}

function cardNumberField(driver) {
  return driver.isIOS
    ? '~AdyenCard.FormCardNumberContainerItem.numberItem.textField'
    : 'android=new UiSelector().className("android.widget.EditText")';
}

async function waitForAny(driver, selectors, timeout, description) {
  await driver.waitUntil(
    async () => {
      for (const selector of selectors) {
        if (await (await driver.$(selector)).isExisting()) {
          return true;
        }
      }
      return false;
    },
    { timeout, timeoutMsg: `${description} did not render` }
  );
}

async function openTab(driver, tab) {
  const control = await driver.$(testId(driver, `tab-${tab}`));
  await control.waitForDisplayed({ timeout: 45000 });
  await control.click();
}

async function visitScreen(driver, { tab, route, expect, description }) {
  await openTab(driver, tab);
  const menuItem = await driver.$(testId(driver, `menu-item-${route}`));
  await menuItem.waitForDisplayed({ timeout: 15000 });
  await menuItem.click();
  await waitForAny(driver, expect(driver), 45000, description);
  await checkForRNErrors(driver, saveScreenshot);
  await navigateBackTo(driver, testId(driver, `tab-${tab}`));
}

// On Android the first back press only closes the keyboard of an auto-focused card field.
async function navigateBackTo(driver, selector) {
  const target = await driver.$(selector);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await driver.back();
    if (
      await target
        .waitForDisplayed({ timeout: 5000 })
        .then(() => true)
        .catch(() => false)
    ) {
      return;
    }
  }
  throw new Error(`Back navigation did not return to ${selector}`);
}

const SCREENS = [
  {
    tab: 'Sessions',
    route: 'SessionsComponentsCheckout',
    description: 'Sessions Components card form',
    expect: (driver) => [cardNumberField(driver)],
  },
  {
    tab: 'Advanced',
    route: 'AdvancedCheckout',
    description: 'Advanced Checkout card form',
    expect: (driver) => [cardNumberField(driver)],
  },
  {
    tab: 'API-Only',
    route: 'CustomCard',
    description: 'Custom Card (CSE) form',
    expect: (driver) => [
      driver.isAndroid
        ? 'android=new UiSelector().textMatches("(?i)^pay .*")'
        : '-ios predicate string:label BEGINSWITH[c] "Pay "',
    ],
  },
  {
    tab: 'API-Only',
    route: 'StoredCards',
    description: 'Stored Cards list',
    expect: (driver) => [
      textContaining(driver, 'Stored payments'),
      textContaining(driver, 'No stored payment methods'),
    ],
  },
  {
    tab: 'API-Only',
    route: 'ValidationRoutes',
    description: 'Checkout validation routes',
    expect: (driver) => [testId(driver, 'validation-route-menu')],
  },
];

/**
 * Smoke-navigates every example screen reachable from Home (Sessions, Advanced, API-Only tabs
 * and the Settings modal) and checks that each renders its content without a React error.
 */
async function testExampleNavigation(driver, _isAndroid) {
  for (const tab of ['Sessions', 'Advanced', 'API-Only']) {
    await openTab(driver, tab);
  }

  await openTab(driver, 'Sessions');
  const dropInItem = await driver.$(
    testId(driver, 'menu-item-SessionsDropInCheckout')
  );
  await dropInItem.waitForDisplayed({ timeout: 15000 });

  for (const screen of SCREENS) {
    await visitScreen(driver, screen);
  }

  const settings = await driver.$(textExactly(driver, 'Settings'));
  await settings.waitForDisplayed({ timeout: 15000 });
  await settings.click();
  await waitForAny(
    driver,
    [textContaining(driver, 'Card Settings')],
    15000,
    'Settings'
  );
  await checkForRNErrors(driver, saveScreenshot);
  const save = await driver.$(textExactly(driver, 'Save'));
  await save.waitForDisplayed({ timeout: 15000 });
  await save.click();
  await (
    await driver.$(testId(driver, 'tab-Sessions'))
  ).waitForDisplayed({ timeout: 15000 });

  console.log(
    '==> [Test] SUCCESS: Every example screen and the Settings modal rendered without React errors.'
  );
}

module.exports = { testExampleNavigation };
