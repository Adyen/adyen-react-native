export function setImportSwift(contents: string): string {
  const importLine = 'import AdyenReactNative';

  contents = contents.replace(
    'import UIKit\n',
    `import UIKit\n\n${importLine}\n`
  );
  return contents;
}
