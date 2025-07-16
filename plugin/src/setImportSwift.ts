export function setImportSwift(contents: string): string {
  const importLine = 'import AdyenReactNative';

  if (contents.includes(importLine)) {
    return contents;
  }

  contents = contents.replace('import Expo', `import Expo\n${importLine}`);
  return contents;
}
