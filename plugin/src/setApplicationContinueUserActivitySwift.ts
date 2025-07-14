export function setApplicationContinueUserActivitySwift(contents: string): string {
  // Check if the function exists
  const existingFunction = contents.match(/func application\(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping \(\[UIUserActivityRestoring\]?\)? -> Void\) -> Bool/g);
  
  if (existingFunction) {
    // If the function exists, add our RedirectComponent call
    return contents.replace(/func application\(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping \(\[UIUserActivityRestoring\]?\)? -> Void\) -> Bool\s*\{\s*return/,
      `func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return RedirectComponent.applicationDidOpen(from: userActivity.webpageURL) ||`);
  }

  // If the function doesn't exist, create it with the correct Expo pattern
  const continueActivityFunction = `    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
        return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result || RedirectComponent.applicationDidOpen(from: userActivity.webpageURL)
    }`;

  // Find the end of the AppDelegate class
  const classEndIndex = contents.indexOf('}', contents.indexOf('class AppDelegate'));
  
  // Insert the function before the closing brace
  contents = contents.slice(0, classEndIndex) + '\n' + continueActivityFunction + '\n' + contents.slice(classEndIndex);
  
  return contents;
}
