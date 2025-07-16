export function setApplicationContinueUserActivitySwift(
  contents: string
): string {
  // Check if the function exists
  const existingFunction = contents.match(
    /public override func application\(\s* _ application: UIApplication,\s* continue userActivity: NSUserActivity,\s* restorationHandler: @escaping \(\[UIUserActivityRestoring]\?\) -> Void\s* \) -> Bool {/g
  );

  if (existingFunction) {
    // If the function exists, find the return statement and add our call
    const oldPattern =
      /let result = RCTLinkingManager\.application\(application, continue: userActivity, restorationHandler: restorationHandler\)/g;
    if (contents.match(oldPattern)) {
      const newPattern = `if let url = userActivity.webpageURL, RedirectComponent.applicationDidOpen(from: url) {
      return true
    }
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)`;
      return contents.replace(oldPattern, newPattern);
    }
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
  const classEndIndex = contents.lastIndexOf(
    '}',
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
