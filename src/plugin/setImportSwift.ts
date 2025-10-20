export function setImportSwift(contents: string): string {
  const importLine = 'import Adyen';

  if (contents.includes(importLine)) {
    return contents;
  }

  const importExpo = 'import Expo';
  if (contents.includes(importExpo)) {
    return contents.replace(importExpo, `${importExpo}\n${importLine}`);
  }

  const importUIKit = 'import UIKit';
  if (contents.includes(importUIKit)) {
    return contents.replace(importUIKit, `${importUIKit}\n${importLine}`);
  }

  return contents;
}
