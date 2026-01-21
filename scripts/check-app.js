const fs = require('fs');
const { remote } = require('webdriverio');

(async () => {
  const isAndroid = process.env.PLATFORM_NAME === 'android';
  console.log(
    `\n==> [Test] Checking App on ${isAndroid ? 'Android' : 'iOS'}...`
  );

  const androidAppPackage = process.env.APP_PACKAGE || 'com.testproject';
  const androidAppActivity = 'MainActivity';
  const iosScheme = process.env.IOS_SCHEME || 'TestProject';
  const iosBundleId = 'org.reactjs.native.example.' + iosScheme;
  const iosUdid = process.env.IOS_UDID;

  const waitTimeoutMs = 120000;
  const connectionRetryTimeout = isAndroid ? 240000 : 600000;
  const connectionRetryCount = isAndroid ? 3 : 5;

  const rnErrorMarkers = [
    'Unhandled JS Exception',
    'LogBox',
    'RedBox',
    'Unable to resolve module',
    'Invariant Violation',
    'TypeError',
    'ReferenceError',
    'SyntaxError',
  ];

  const driver = await remote({
    protocol: 'http',
    hostname: '127.0.0.1',
    path: '/',
    port: 4723,
    connectionRetryTimeout,
    connectionRetryCount,
    capabilities: isAndroid
      ? {
          'platformName': 'Android',
          'appium:automationName': 'UiAutomator2',
          'appium:appPackage': androidAppPackage,
          'appium:appActivity': androidAppActivity,
          'appium:newCommandTimeout': 120,
        }
      : {
          'platformName': 'iOS',
          'appium:automationName': 'XCUITest',
          'appium:bundleId': iosBundleId,
          'appium:newCommandTimeout': 120,
          'appium:wdaLaunchTimeout': 600000,
          'appium:wdaConnectionTimeout': 600000,
          'appium:wdaStartupRetries': 3,
          'appium:wdaStartupRetryInterval': 20000,
          'appium:udid': iosUdid
        },
    logLevel: 'error',
  });

  try {
    // 1. Define Selector
    // Android: Locates by visible text
    // iOS: Locates by Accessibility ID (which maps to 'title' prop in RN Buttons)
    const selectors = isAndroid
      ? [
          'android=new UiSelector().textMatches("(?i).*drop\\s*in.*")',
          'android=new UiSelector().textContains("DROPIN")',
          '~dropin-button',
        ]
      : ['~dropin-button'];

    let dropInBtn;
    const startTime = Date.now();
    let lastErrorCheckAt = 0;

    while (Date.now() - startTime < waitTimeoutMs) {
      const now = Date.now();
      if (now - lastErrorCheckAt >= 5000) {
        const pageSource = await driver.getPageSource();
        const hits = rnErrorMarkers.filter((m) => pageSource.includes(m));
        if (hits.length > 0) {
          try {
            const screenshotPath = './appium_failure.png';
            await driver.saveScreenshot(screenshotPath);
            console.error(`==> [Test] Saved screenshot to ${screenshotPath}`);
          } catch (e) {
            console.error('==> [Test] Failed to capture screenshot');
            console.error(e);
          }

          throw new Error(
            `React Native error screen detected: ${hits.join(', ')}`
          );
        }
        lastErrorCheckAt = now;
      }

      for (const btnSelector of selectors) {
        const candidate = await driver.$(btnSelector);
        const isDisplayed = await candidate.isDisplayed().catch(() => false);
        if (isDisplayed) {
          dropInBtn = candidate;
          break;
        }
      }

      if (dropInBtn) {
        break;
      }

      await driver.pause(2000);
    }

    if (!dropInBtn) {
      throw new Error(
        `element (${JSON.stringify(selectors)}) still not displayed after ${waitTimeoutMs}ms`
      );
    }

    console.log("==> [Test] SUCCESS: 'Open DropIn' button is visible.");
  } catch (error) {
    console.error('==> [Test] FAILURE: App did not load or button not found.');
    console.error(error);

    try {
      const pageSource = await driver.getPageSource();
      console.error(`==> [Test] Page source length: ${pageSource.length}`);
      const pageSourcePath = './appium_page_source.xml';
      fs.writeFileSync(pageSourcePath, pageSource, 'utf8');
      console.error(`==> [Test] Saved page source to ${pageSourcePath}`);
    } catch (e) {
      console.error('==> [Test] Failed to capture page source');
      console.error(e);
    }

    try {
      const screenshotPath = './appium_failure.png';
      await driver.saveScreenshot(screenshotPath);
      console.error(`==> [Test] Saved screenshot to ${screenshotPath}`);
    } catch (e) {
      console.error('==> [Test] Failed to capture screenshot');
      console.error(e);
    }

    process.exitCode = 1;
  } finally {
    // Cleanup session
    await driver.deleteSession();
  }
})();
