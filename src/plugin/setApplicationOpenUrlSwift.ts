import { findClassEndIndex } from './utils/findClassEndIndex';

export function setApplicationOpenUrlSwift(contents: string): string {
  // Check if the function exists
  const existingFunction = contents.match(
    /public override func application\(\s* _ app: UIApplication,\s* open url: URL,\s* options: \[UIApplication\.OpenURLOptionsKey: Any\] = \[:\]\s* \) -> Bool {/g
  );

  if (existingFunction) {
    // If the function exists, find the return statement and add our call
    const defaultTemplatePattern =
      /return\s+super\.application\(app, open: url, options: options\)\s+\|\|\s+RCTLinkingManager\.application\(app, open: url, options: options\)/g;
    const customTemplatePattern =
      /return\s+super\.application\(app, open: url, options: options\)\s/g;
    if (defaultTemplatePattern.test(contents)) {
      return contents.replaceAll(
        defaultTemplatePattern,
        'return ADYRedirectComponent.applicationDidOpen(url) || super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)'
      );
    } else if (customTemplatePattern.test(contents)) {
      return contents.replaceAll(
        customTemplatePattern,
        'return ADYRedirectComponent.applicationDidOpen(url) || super.application(app, open: url, options: options)'
      );
    }
    return contents;
  }

  // If the function doesn't exist, create it with the correct Expo pattern
  const openUrlFunction = `   public override func application( _ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:] ) -> Bool {
      return ADYRedirectComponent.applicationDidOpen(url) || super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
    }`;

  // Find the end of the AppDelegate class
  const classEndIndex = findClassEndIndex(contents, 'AppDelegate');

  // Insert the function before the closing brace
  contents =
    contents.slice(0, classEndIndex) +
    '\n' +
    openUrlFunction +
    '\n' +
    contents.slice(classEndIndex);

  return contents;
}
