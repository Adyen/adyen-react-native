import { withAdyenIos } from '../withAdyenIos';
import { describe, it, expect } from '@jest/globals';

// Import the mocked functions to spy on them
import { withAppDelegate, withEntitlementsPlist } from '@expo/config-plugins';
import { setEntitlements } from '../setEntitlements';
import { setImport } from '../setImport';
import { setApplicationOpenUrl } from '../setApplicationOpenUrl';
import { setApplicationContinueUserActivity } from '../setApplicationContinueUserActivity';
import { setImportSwift } from '../setImportSwift';
import { setApplicationOpenUrlSwift } from '../setApplicationOpenUrlSwift';
import { setApplicationContinueUserActivitySwift } from '../setApplicationContinueUserActivitySwift';

// Mock all dependencies to isolate the withAdyenIos function
jest.mock('@expo/config-plugins', () => ({
  // The HOFs are mocked to immediately execute the modifier function,
  // allowing us to test the logic within the callback.
  withAppDelegate: jest.fn((config, modifier) => modifier(config)),
  withEntitlementsPlist: jest.fn((config, modifier) => modifier(config)),
}));

jest.mock('../setEntitlements', () => ({
  setEntitlements: jest.fn((entitlements, id) => ({
    ...entitlements,
    'merchant.id': id,
  })),
}));

jest.mock('../setImport', () => ({
  setImport: jest.fn((content) => `${content}\n// MOCK: obj-c import`),
}));

jest.mock('../setApplicationOpenUrl', () => ({
  setApplicationOpenUrl: jest.fn(
    (content) => `${content}\n// MOCK: obj-c openurl`
  ),
}));

jest.mock('../setApplicationContinueUserActivity', () => ({
  setApplicationContinueUserActivity: jest.fn(
    (content) => `${content}\n// MOCK: obj-c useractivity`
  ),
}));

jest.mock('../setImportSwift', () => ({
  setImportSwift: jest.fn((content) => `${content}\n// MOCK: swift import`),
}));

jest.mock('../setApplicationOpenUrlSwift', () => ({
  setApplicationOpenUrlSwift: jest.fn(
    (content) => `${content}\n// MOCK: swift openurl`
  ),
}));

jest.mock('../setApplicationContinueUserActivitySwift', () => ({
  setApplicationContinueUserActivitySwift: jest.fn(
    (content) => `${content}\n// MOCK: swift useractivity`
  ),
}));

const merchantIdentifier = 'merchant.com.example.test';
const mockPluginSettings = {
  merchantIdentifier: merchantIdentifier,
  useFrameworks: false,
};

describe('withAdyenIos', () => {
  // Reset all mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should apply Objective-C changes for a non-Swift AppDelegate', async () => {
    const config = {
      name: 'test-app',
      slug: 'test-app',
      modResults: { contents: '// This is an Objective-C AppDelegate' },
    };

    const result = withAdyenIos(config, {
      merchantIdentifier: undefined,
      useFrameworks: false,
    });

    // Check that the correct HOF was called
    expect(withAppDelegate).toHaveBeenCalled();

    // Check that the Objective-C modifiers were called
    expect(setImport).toHaveBeenCalled();
    expect(setApplicationOpenUrl).toHaveBeenCalled();
    expect(setApplicationContinueUserActivity).toHaveBeenCalled();

    // Check that Swift modifiers were NOT called
    expect(setImportSwift).not.toHaveBeenCalled();
    expect(setApplicationOpenUrlSwift).not.toHaveBeenCalled();
    expect(setApplicationContinueUserActivitySwift).not.toHaveBeenCalled();

    // Check the final content of the AppDelegate
    const finalContent = result.modResults.contents;
    expect(finalContent).toContain('// MOCK: obj-c import');
    expect(finalContent).toContain('// MOCK: obj-c openurl');
    expect(finalContent).toContain('// MOCK: obj-c useractivity');
  });

  it('should apply Swift changes for a Swift AppDelegate', async () => {
    const config = {
      name: 'test-app',
      slug: 'test-app',
      modResults: { contents: 'import Expo \n// This is a Swift AppDelegate' },
    };

    const result = withAdyenIos(config, mockPluginSettings);

    // Check that the correct HOF was called
    expect(withAppDelegate).toHaveBeenCalled();

    // Check that the Swift modifiers were called
    expect(setImportSwift).toHaveBeenCalled();
    expect(setApplicationOpenUrlSwift).toHaveBeenCalled();
    expect(setApplicationContinueUserActivitySwift).toHaveBeenCalled();

    // Check that Objective-C modifiers were NOT called
    expect(setImport).not.toHaveBeenCalled();
    expect(setApplicationOpenUrl).not.toHaveBeenCalled();
    expect(setApplicationContinueUserActivity).not.toHaveBeenCalled();

    // Check the final content of the AppDelegate
    const finalContent = result.modResults.contents;
    expect(finalContent).toContain('// MOCK: swift import');
    expect(finalContent).toContain('// MOCK: swift openurl');
    expect(finalContent).toContain('// MOCK: swift useractivity');
  });

  it('should set entitlements when merchantIdentifier is provided', async () => {
    const config = {
      name: 'test-app',
      slug: 'test-app',
      modResults: { contents: '// AppDelegate content' },
    };

    withAdyenIos(config, mockPluginSettings);

    // Check that both HOFs were called
    expect(withAppDelegate).toHaveBeenCalled();
    expect(withEntitlementsPlist).toHaveBeenCalled();

    // Check that setEntitlements was called with the correct identifier
    expect(setEntitlements).toHaveBeenCalledWith(
      expect.any(Object),
      merchantIdentifier
    );
  });

  it('should NOT set entitlements when merchantIdentifier is missing', async () => {
    const config = {
      name: 'test-app',
      slug: 'test-app',
      modResults: { contents: '// AppDelegate content' },
    };

    console.log('no merchantIdentifier');
    withAdyenIos(config, {
      merchantIdentifier: '',
      useFrameworks: false,
    });

    // Check that the entitlements HOF was NOT called
    expect(withEntitlementsPlist).not.toHaveBeenCalled();
    expect(setEntitlements).not.toHaveBeenCalled();
  });

  it('should skip modification if AppDelegate is already configured', async () => {
    const originalContent =
      'import AdyenReactNative\n// Already contains ADYRedirectComponent';
    const config = {
      name: 'test-app',
      slug: 'test-app',
      modResults: { contents: originalContent },
    };

    const result = withAdyenIos(config, mockPluginSettings);

    // Check that no modifiers were called
    expect(setImport).not.toHaveBeenCalled();
    expect(setImportSwift).not.toHaveBeenCalled();
    // ...and so on for all other modifiers

    // Check that the content is unchanged
    expect(result.modResults.contents).toBe(originalContent);
  });
});
