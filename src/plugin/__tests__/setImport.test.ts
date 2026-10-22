import { setImport } from '../setImport';
import { describe, expect, test } from '@jest/globals';

const appDelegateHeader = `#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
`;

describe('setImport', () => {
  test('adds an import that resolves with and without use_frameworks!', () => {
    const result = setImport(appDelegateHeader);

    expect(result).toBe(`#import "AppDelegate.h"

#if __has_include(<adyen_react_native/ADYRedirectComponent.h>)
#import <adyen_react_native/ADYRedirectComponent.h>
#else
#import <adyen-react-native/ADYRedirectComponent.h>
#endif
#import <React/RCTBundleURLProvider.h>
`);
  });

  test('leaves contents without an AppDelegate.h import unchanged', () => {
    const contents = '#import <React/RCTBundleURLProvider.h>\n';

    expect(setImport(contents)).toBe(contents);
  });

  test('handles an empty string', () => {
    expect(setImport('')).toBe('');
  });
});
