import { setApplicationOpenUrlSwift } from '../setApplicationOpenUrlSwift';
import { describe, it, expect } from '@jest/globals';
import { malformedAppDelegate } from './_mock_malformedAppDelegate';
import { emptyAppDelegate } from './_mock_emptyAppDelegate';
import { mockAppDelegate } from './_mock_AppDelegate';

describe('setApplicationOpenUrlSwift', () => {
  it('should add RedirectComponent call to existing function', () => {
    const result = setApplicationOpenUrlSwift(mockAppDelegate);

    const functionDefinition =
      /public override func application\(\s* _ app: UIApplication,\s* open url: URL,\s* options: \[UIApplication\.OpenURLOptionsKey: Any\] = \[:\]\s* \) -> Bool {/;
    const expectedReturn =
      /return RedirectComponent\.applicationDidOpen\(from: url\) \|\| super\.application\(app, open: url, options: options\) \|\| RCTLinkingManager\.application\(app, open: url, options: options\)/;
    expect(result).toMatch(functionDefinition);
    expect(result).toMatch(expectedReturn);
  });

  it('should create new function with RedirectComponent first', () => {
    const result = setApplicationOpenUrlSwift(emptyAppDelegate);

    const functionDefinition =
      /public override func application\(\s* _ app: UIApplication,\s* open url: URL,\s* options: \[UIApplication\.OpenURLOptionsKey: Any\] = \[:\]\s* \) -> Bool {/;
    const expectedReturn =
      /return RedirectComponent\.applicationDidOpen\(from: url\) \|\| super\.application\(app, open: url, options: options\) \|\| RCTLinkingManager\.application\(app, open: url, options: options\)/;
    expect(result).toMatch(functionDefinition);
    expect(result).toMatch(expectedReturn);
  });

  it('should handle malformed return statement gracefully', () => {
    const result = setApplicationOpenUrlSwift(malformedAppDelegate);

    const functionDefinition =
      /public override func application\(\s* _ app: UIApplication,\s* open url: URL,\s* options: \[UIApplication\.OpenURLOptionsKey: Any\] = \[:\]\s* \) -> Bool {/;
    const expectedReturn =
      /return RedirectComponent\.applicationDidOpen\(from: url\) \|\| super\.application\(app, open: url, options: options\) \|\| RCTLinkingManager\.application\(app, open: url, options: options\)/;
    expect(result).toMatch(functionDefinition);
    expect(result).toMatch(expectedReturn);
  });
});
