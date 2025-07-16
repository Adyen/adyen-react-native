export function setImportSwift(contents: string): string {
  const importLine = 'import AdyenReactNative';

  contents = contents.replace('import Expo', `import Expo\n${importLine}`);
  return contents;
}
