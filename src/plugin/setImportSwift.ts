// Under Swift Package Manager, Adyen iOS splits into several modules and `RedirectComponent` lives in
// `AdyenActions`, which `adyen_react_native` re-exports. The CocoaPod is the single `Adyen` module and
// `adyen_react_native` re-exports nothing there, so the AppDelegate needs both imports.
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
