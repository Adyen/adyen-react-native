const { remote } = require('webdriverio');

(async () => {
  const isAndroid = process.env.PLATFORM_NAME === 'android';
  console.log(`\n==> [Test] Checking App on ${isAndroid ? 'Android' : 'iOS'}...`);

  const driver = await remote({
    path: '/',
    port: 4723,
    capabilities: isAndroid
      ? {
          platformName: 'Android',
          'appium:automationName': 'UiAutomator2',
          'appium:appPackage': 'com.testproject',
          'appium:appActivity': '.MainActivity',
          'appium:newCommandTimeout': 120,
          // If you want to force a specific device (optional in CI)
          // 'appium:deviceName': 'Android Emulator', 
        }
      : {
          platformName: 'iOS',
          'appium:automationName': 'XCUITest',
          'appium:bundleId': 'org.reactjs.native.example.TestProject',
          'appium:newCommandTimeout': 120,
          // 'appium:deviceName': 'iPhone 15', // Matches simulator started in shell script
        },
    logLevel: 'error',
  });

  try {
    // 1. Define Selector
    // Android: Locates by visible text
    // iOS: Locates by Accessibility ID (which maps to 'title' prop in RN Buttons)
    const btnSelector = isAndroid 
      ? '//*[@text="Open DropIn"]' 
      : '~Open DropIn';

    console.log(`==> [Test] Waiting for button: "${btnSelector}"`);

    // 2. Find Element
    const dropInBtn = await driver.$(btnSelector);

    // 3. Wait for Display (Max 45s to allow for compilation/launch slowness)
    await dropInBtn.waitForDisplayed({ timeout: 45000 });

    console.log("==> [Test] SUCCESS: 'Open DropIn' button is visible.");

  } catch (error) {
    console.error("==> [Test] FAILURE: App did not load or button not found.");
    console.error(error);
    process.exit(1); // Exit with error code to fail the CI job
  } finally {
    // Cleanup session
    await driver.deleteSession();
  }
})();