// Adyen iOS is a Swift package with several modules under both CocoaPods and Swift Package Manager.
// `RedirectComponent` lives in `AdyenActions`, which `adyen_react_native` re-exports.
const IMPORT_ADYEN = 'import Adyen';
const IMPORT_ADYEN_REACT_NATIVE = 'import adyen_react_native';
const IMPORT_ADYEN_PATTERN = /^import Adyen$/m;
const IMPORT_ADYEN_REACT_NATIVE_PATTERN = /^import adyen_react_native$/m;
const IMPORT_LINES = `${IMPORT_ADYEN}\n${IMPORT_ADYEN_REACT_NATIVE}`;

export function setImportSwift(contents: string): string {
  const hasImportAdyen = IMPORT_ADYEN_PATTERN.test(contents);
  const hasImportAdyenReactNative =
    IMPORT_ADYEN_REACT_NATIVE_PATTERN.test(contents);

  if (hasImportAdyen && hasImportAdyenReactNative) {
    return contents;
  }
  if (hasImportAdyen) {
    return contents.replace(IMPORT_ADYEN_PATTERN, IMPORT_LINES);
  }
  if (hasImportAdyenReactNative) {
    return contents.replace(IMPORT_ADYEN_REACT_NATIVE_PATTERN, IMPORT_LINES);
  }

  const importExpo = 'import Expo';
  if (contents.includes(importExpo)) {
    return contents.replace(importExpo, `${importExpo}\n${IMPORT_LINES}`);
  }

  const importUIKit = 'import UIKit';
  if (contents.includes(importUIKit)) {
    return contents.replace(importUIKit, `${importUIKit}\n${IMPORT_LINES}`);
  }

  return contents;
}
