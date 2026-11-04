import { setImportSwift } from '../setImportSwift';
import { describe, expect } from '@jest/globals';

describe('setImportSwift', () => {
  // Test case 1: The import lines already exist in the content.
  test('should return the original content if the imports already exist', () => {
    const originalContents = `
import Expo
import Adyen
import adyen_react_native
import React
    `;
    const result = setImportSwift(originalContents);
    // The content should not be changed.
    expect(result).toBe(originalContents);
  });

  // Test case 1b: An AppDelegate configured by an earlier plugin version only imports Adyen.
  test('should add "import adyen_react_native" after an existing "import Adyen"', () => {
    const originalContents = `
import Expo
import Adyen
import React
    `;
    const expectedContents = `
import Expo
import Adyen
import adyen_react_native
import React
    `;
    const result = setImportSwift(originalContents);
    expect(result).toBe(expectedContents);
    expect(setImportSwift(result)).toBe(expectedContents);
  });

  // Test case 1c: "import Adyen" must not match other Adyen modules.
  test('should not treat "import AdyenActions" as "import Adyen"', () => {
    const originalContents = `
import Expo
import AdyenActions
import React
    `;
    const expectedContents = `
import Expo
import Adyen
import adyen_react_native
import AdyenActions
import React
    `;
    const result = setImportSwift(originalContents);
    expect(result).toBe(expectedContents);
  });

  // Test case 2: The import lines do not exist and should be added.
  test('should add the import lines after "import Expo" if they do not exist', () => {
    const originalContents = `
import Expo
import React
    `;
    const expectedContents = `
import Expo
import Adyen
import adyen_react_native
import React
    `;
    const result = setImportSwift(originalContents);
    // The new import line should be present.
    expect(result).toBe(expectedContents);
  });

  // Test case 3: Edge case where "import Expo" is not present.
  test('should not change the content if "import Expo" is not found', () => {
    const originalContents = `
#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
    `;
    const result = setImportSwift(originalContents);
    // The content should remain unchanged because the replacement target is missing.
    expect(result).toBe(originalContents);
  });

  // Test case 4: Empty string input.
  test('should handle an empty string without errors', () => {
    const originalContents = '';
    const result = setImportSwift(originalContents);
    expect(result).toBe('');
  });

  // Test case 5: Content with "import Expo" but no other imports.
  test('should correctly add the import when there is no Expo', () => {
    const originalContents = `
import UIKit
import React
import React_RCTAppDelegate
`;
    const expectedContents = `
import UIKit
import Adyen
import adyen_react_native
import React
import React_RCTAppDelegate
`;
    const result = setImportSwift(originalContents);
    expect(result).toBe(expectedContents);
  });
});
