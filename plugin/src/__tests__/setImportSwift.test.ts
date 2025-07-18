import { setImportSwift } from '../setImportSwift';
import { describe, it, expect } from '@jest/globals';

describe('setImportSwift', () => {
  // Test case 1: The import line already exists in the content.
  test('should return the original content if the import already exists', () => {
    const originalContents = `
import Expo
import Adyen
import React
    `;
    const result = setImportSwift(originalContents);
    // The content should not be changed.
    expect(result).toBe(originalContents);
  });

  // Test case 2: The import line does not exist and should be added.
  test('should add the import line after "import Expo" if it does not exist', () => {
    const originalContents = `
import Expo
import React
    `;
    const expectedContents = `
import Expo
import Adyen
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
import React
import React_RCTAppDelegate
`;
    const result = setImportSwift(originalContents);
    expect(result).toBe(expectedContents);
  });
});
