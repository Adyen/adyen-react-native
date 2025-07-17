export function setApplicationContinueUserActivitySwift(
  contents: string
): string {
  // Check if the function exists
  const existingFunction = contents.match(
    /public override func application\(\s* _ application: UIApplication,\s* continue userActivity: NSUserActivity,\s* restorationHandler: @escaping \(\[UIUserActivityRestoring]\?\) -> Void\s* \) -> Bool {/g
  );

  if (existingFunction) {
    // If the function exists, find the return statement and add our call
    const defaultTemplatePattern =
      /let result = RCTLinkingManager\.application\(application, continue: userActivity, restorationHandler: restorationHandler\)/g;
    const customTemplatePattern =
      /return super\.application\(application, continue: userActivity, restorationHandler: restorationHandler\)/g;
    if (defaultTemplatePattern.test(contents)) {
      const newPattern = `if let url = userActivity.webpageURL, RedirectComponent.applicationDidOpen(from: url) {
      return true
    }
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)`;
      return contents.replace(defaultTemplatePattern, newPattern);
    } else if (customTemplatePattern.test(contents)) {
      const newPattern = `if let url = userActivity.webpageURL, RedirectComponent.applicationDidOpen(from: url) {
      return true
    }
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler)`;
      return contents.replace(customTemplatePattern, newPattern);
    }

    return contents;
  }

  // If the function doesn't exist, create it with the correct Expo pattern
  const continueActivityFunction = `     public override func application( _ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void ) -> Bool {
    if let url = userActivity.webpageURL, RedirectComponent.applicationDidOpen(from: url) {
      return true
    }
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }`;

  // Find the end of the AppDelegate class
  const classEndIndex = contents.indexOf(
    '\n}',
    contents.indexOf('class AppDelegate')
  );

  // Insert the function before the closing brace
  contents =
    contents.slice(0, classEndIndex) +
    '\n' +
    continueActivityFunction +
    '\n' +
    contents.slice(classEndIndex);

  return contents;
}
