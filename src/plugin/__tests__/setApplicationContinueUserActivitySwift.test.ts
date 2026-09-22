import { setApplicationContinueUserActivitySwift } from '../setApplicationContinueUserActivitySwift';
import { describe, it, expect } from '@jest/globals';
import { mockAppDelegate } from './_mock_AppDelegate';
import { emptyAppDelegate } from './_mock_emptyAppDelegate';
import { malformedAppDelegate } from './_mock_malformedAppDelegate';

describe('setApplicationContinueUserActivitySwift', () => {
  it('should add RedirectComponent call to existing function', () => {
    const result = setApplicationContinueUserActivitySwift(mockAppDelegate);

    const functionDefinition =
      /public override func application\(\s* _ application: UIApplication,\s* continue userActivity: NSUserActivity,\s* restorationHandler: @escaping \(\[UIUserActivityRestoring]\?\) -> Void\s* \) -> Bool {/;
    const expectedReturn =
      /return super\.application\(application, continue: userActivity, restorationHandler: restorationHandler\) \|\| result/;
    const expectedExpoRedirect =
      /let result = RCTLinkingManager\.application\(application, continue: userActivity, restorationHandler: restorationHandler\)/;
    const expectedRedirectComponent =
      /if let url = userActivity\.webpageURL, ADYRedirectComponent\.applicationDidOpen\(url\) {/;

    expect(result).toMatch(functionDefinition);
    expect(result).toMatch(expectedReturn);
    expect(result).toMatch(expectedExpoRedirect);
    expect(result).toMatch(expectedRedirectComponent);
  });

  it('should create new function with RedirectComponent first', () => {
    const result = setApplicationContinueUserActivitySwift(emptyAppDelegate);

    const functionDefinition =
      /public override func application\(\s* _ application: UIApplication,\s* continue userActivity: NSUserActivity,\s* restorationHandler: @escaping \(\[UIUserActivityRestoring]\?\) -> Void\s* \) -> Bool {/;
    const expectedReturn =
      /return super\.application\(application, continue: userActivity, restorationHandler: restorationHandler\) \|\| result/;
    const expectedExpoRedirect =
      /let result = RCTLinkingManager\.application\(application, continue: userActivity, restorationHandler: restorationHandler\)/;
    const expectedRedirectComponent =
      /if let url = userActivity\.webpageURL, ADYRedirectComponent\.applicationDidOpen\(url\) {/;

    expect(result).toMatch(functionDefinition);
    expect(result).toMatch(expectedReturn);
    expect(result).toMatch(expectedExpoRedirect);
    expect(result).toMatch(expectedRedirectComponent);

    const intaktDelegateClass =
      /class ReactNativeDelegate: ExpoReactNativeFactoryDelegate \{\s*override func sourceURL\(for bridge: RCTBridge\) -> URL\? \{\s*bridge\.bundleURL \?\? bundleURL\(\)\s*}\s*}/;
    expect(result).toMatch(intaktDelegateClass);
  });

  it('should handle malformed return statement gracefully', () => {
    const result =
      setApplicationContinueUserActivitySwift(malformedAppDelegate);

    const functionDefinition =
      /public override func application\(\s* _ application: UIApplication,\s* continue userActivity: NSUserActivity,\s* restorationHandler: @escaping \(\[UIUserActivityRestoring]\?\) -> Void\s* \) -> Bool {/;
    const expectedReturn =
      /return super\.application\(application, continue: userActivity, restorationHandler: restorationHandler\)/;

    expect(result).toMatch(functionDefinition);
    expect(result).toMatch(expectedReturn);
  });
});
