async function openValidationRoutes(driver) {
  const apiOnlyTab = await driver.$('~tab-API-Only');
  await apiOnlyTab.waitForDisplayed({ timeout: 15000 });
  await apiOnlyTab.click();

  const validationMenu = await driver.$('~menu-item-ValidationRoutes');
  await validationMenu.waitForDisplayed({ timeout: 15000 });
  await validationMenu.click();
}

async function expectStatus(driver, expected, timeout = 30000) {
  const status = await driver.$('~validation-status');
  await status.waitForDisplayed({ timeout });
  await driver.waitUntil(async () => (await status.getText()) === expected, {
    timeout,
    timeoutMsg: `Expected validation status "${expected}"`,
  });
}

/**
 * Exercises the example-only lifecycle and standalone controls entirely through accessibility
 * selectors. Payment authorisation remains covered by the session and advanced tests so this
 * route can focus on observable coordinator lifecycle outcomes without synthetic native faults.
 */
async function testValidationRoutes(driver, isAndroid) {
  await openValidationRoutes(driver);

  const lifecycleRoute = await driver.$('~validation-route-lifecycle');
  await lifecycleRoute.waitForDisplayed({ timeout: 15000 });
  await lifecycleRoute.click();
  await expectStatus(driver, 'embedded-ready');

  const recycle = await driver.$('~validation-recycle-presenter');
  await recycle.click();
  await expectStatus(driver, 'presenter-recycled');

  const cse = await driver.$('~validation-cse');
  await cse.click();
  await expectStatus(driver, 'cse-validation-complete');

  const actionCancel = await driver.$('~validation-action-cancel');
  await actionCancel.click();
  await expectStatus(driver, 'standalone-action-cancelled');

  const invalidate = await driver.$('~validation-invalidate');
  await invalidate.click();
  await expectStatus(driver, 'checkout-invalidated');

  if (isAndroid) {
    const exit = await driver.$('~validation-exit');
    await exit.click();
  }

  console.log(
    '==> [Test] SUCCESS: Lifecycle, standalone Action cancellation, and CSE state labels are selector-driven.'
  );
}

module.exports = { testValidationRoutes };
