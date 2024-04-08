export function setRedirectComponent(contents: string): string {
  if (contents.includes(
    '[super application:application openURL:url options:options]'
  )) {
    contents = contents.replace(
      '[super application:application openURL:url options:options]',
      '[ADYRedirectComponent applicationDidOpenURL:url] ||\n' +
      '  [super application:application openURL:url options:options]'
    );
  } else {
    contents = contents.replace(
      '@end',
      `// Linking API\n` +
      `- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {\n` +
      `  // Adyen SDK\n` +
      `  return [ADYRedirectComponent applicationDidOpenURL:url];\n` +
      `}\n` +
      '@end'
    );
  }
  return contents;
}
