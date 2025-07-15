export function setApplicationContinueUserActivitySwift(contents: string): string {
  // Check if the function exists
  const existingFunction = contents.match(/func application\(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping \(\[UIUserActivityRestoring\]?\)? -> Void\) -> Bool/g);
  
  if (existingFunction) {
    // If the function exists, find the return statement and add our call
    const returnPattern = /return\s+super\.application\(application, continue: userActivity, restorationHandler: restorationHandler\)\s+\|\|\s+result/g;
    if (contents.match(returnPattern)) {
      return contents.replace(returnPattern,
        'return RedirectComponent.applicationDidOpen(from: userActivity.webpageURL) || super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result');
    }
  }

  // If the function doesn't exist, create it with the correct Expo pattern
  const continueActivityFunction = `    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
        return RedirectComponent.applicationDidOpen(from: userActivity.webpageURL) || super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
    }`;

  // Find the end of the AppDelegate class
  const classEndIndex = contents.indexOf('}', contents.indexOf('class AppDelegate'));
  
  // Insert the function before the closing brace
  contents = contents.slice(0, classEndIndex) + '\n' + continueActivityFunction + '\n' + contents.slice(classEndIndex);
  
  return contents;
}
