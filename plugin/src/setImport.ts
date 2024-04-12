export function setImport(contents: string, useFrameworks: boolean): string {
  const importLine = useFrameworks
    ? '#import <adyen_react_native/ADYRedirectComponent.h>'
    : '#import <adyen-react-native/ADYRedirectComponent.h>';

  contents = contents.replace(
    '#import "AppDelegate.h"\n',
    `#import "AppDelegate.h"\n\n${importLine}\n`
  );
  return contents;
}
