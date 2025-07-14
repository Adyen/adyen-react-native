export function setApplicationOpenUrlSwift(contents: string): string {
  // Check if the function exists
  const existingFunction = contents.match(/func application\(_ app: UIApplication, open url: URL, options: \[UIApplication.OpenURLOptionsKey : Any\] = \[:\]\) -> Bool/g);
  
  if (existingFunction) {
    // If the function exists, add our RedirectComponent call
    return contents.replace(/func application\(_ app: UIApplication, open url: URL, options: \[UIApplication.OpenURLOptionsKey : Any\] = \[:\]\) -> Bool\s*\{\s*return/,
      `func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return RedirectComponent.applicationDidOpen(from: url) ||`);
  }

  // If the function doesn't exist, create it with the correct Expo pattern
  const openUrlFunction = `    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options) || RedirectComponent.applicationDidOpen(from: url)
    }`;

  // Find the end of the AppDelegate class
  const classEndIndex = contents.indexOf('}', contents.indexOf('class AppDelegate'));
  
  // Insert the function before the closing brace
  contents = contents.slice(0, classEndIndex) + '\n' + openUrlFunction + '\n' + contents.slice(classEndIndex);
  
  return contents;
}
