const fs = require('fs');

async function saveScreenshot(driver, path = './appium_failure.png') {
  try {
    await driver.saveScreenshot(path);
    console.error(`==> [Test] Saved screenshot to ${path}`);
  } catch (e) {
    console.error('==> [Test] Failed to capture screenshot');
    console.error(e);
  }
}

async function savePageSource(driver, path = './appium_page_source.xml') {
  try {
    const pageSource = await driver.getPageSource();
    console.error(`==> [Test] Page source length: ${pageSource.length}`);
    fs.writeFileSync(path, pageSource, 'utf8');
    console.error(`==> [Test] Saved page source to ${path}`);
  } catch (e) {
    console.error('==> [Test] Failed to capture page source');
    console.error(e);
  }
}

const RN_ERROR_MARKERS = [
  'Unhandled JS Exception',
  'LogBox',
  'RedBox',
  'Unable to resolve module',
  'Invariant Violation',
  'TypeError',
  'ReferenceError',
  'SyntaxError',
];

async function checkForRNErrors(driver, saveScreenshotFn) {
  const pageSource = await driver.getPageSource();
  const hits = RN_ERROR_MARKERS.filter((m) => pageSource.includes(m));
  if (hits.length > 0) {
    if (saveScreenshotFn) {
      await saveScreenshotFn(driver);
    }
    throw new Error(`React Native error screen detected: ${hits.join(', ')}`);
  }
}

module.exports = {
  saveScreenshot,
  savePageSource,
  checkForRNErrors,
  RN_ERROR_MARKERS,
};
