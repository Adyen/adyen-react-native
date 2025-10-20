export function setApplicationOpenUrl(contents: string): string {
  if (
    contents.includes(
      '[super application:application openURL:url options:options]'
    )
  ) {
    contents = contents.replace(
      '[super application:application openURL:url options:options]',
      '[ADYRedirectComponent applicationDidOpenURL:url] ||\n' +
        '  [super application:application openURL:url options:options]'
    );
  } else if (
    contents.includes(
      '- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {'
    )
  ) {
    contents = contents.replace(
      '- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {\n' +
        '  return ',
      `'- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {\n' +
      '  return [ADYRedirectComponent applicationDidOpenURL:url] || `
    );
  } else {
    contents = contents.replace(
      '@end',
      `\n` +
        `- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {\n` +
        `  return [ADYRedirectComponent applicationDidOpenURL:url] || [super application:application openURL:url options:options] || [RCTLinkingManager application:application openURL:url options:options];\n` +
        `}\n` +
        '@end'
    );
  }
  return contents;
}
