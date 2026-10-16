// `use_frameworks!` exposes the pod headers under its module name (underscores),
// static libraries under the pod name (dashes). Probing both keeps one AppDelegate valid for either setup.
const IMPORT_BLOCK = [
  '#if __has_include(<adyen_react_native/ADYRedirectComponent.h>)',
  '#import <adyen_react_native/ADYRedirectComponent.h>',
  '#else',
  '#import <adyen-react-native/ADYRedirectComponent.h>',
  '#endif',
].join('\n');

export function setImport(contents: string): string {
  return contents.replace(
    '#import "AppDelegate.h"\n',
    `#import "AppDelegate.h"\n\n${IMPORT_BLOCK}\n`
  );
}
