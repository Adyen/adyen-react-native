export function setApplicationContinueUserActivity(contents: string): string {
  if (
    contents.includes(
      '- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {'
    )
  ) {
    contents = contents.replace(
      '- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {\n',
      '- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {\n' +
      '  if ([[userActivity activityType] isEqualToString:NSUserActivityTypeBrowsingWeb]) {\n' +
      '   NSURL *url = [userActivity webpageURL];\n' +
      '    if (![url isEqual:[NSNull null]]) {\n' +
      '      return [ADYRedirectComponent applicationDidOpenURL:url];\n' +
      '    }\n' +
      '  }\n'
    );
  } else {
    contents = contents.replace(
      '@end',
      '\n' +
      '- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler {\n' +
      '  if ([[userActivity activityType] isEqualToString:NSUserActivityTypeBrowsingWeb]) {\n' +
      '    NSURL *url = [userActivity webpageURL];\n' +
      '    if (![url isEqual:[NSNull null]]) {\n' +
      '      return [ADYRedirectComponent applicationDidOpenURL:url];\n' +
      '    }\n' +
      '  }\n' +
      '  return [super application:application continueUserActivity:userActivity restorationHandler:restorationHandler];\n' +
      '}\n' +
      '@end'
    );
  }
  return contents;
}