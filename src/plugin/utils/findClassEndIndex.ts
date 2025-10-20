export function findClassEndIndex(contents: string, className: string): number {
  const classDeclarationIndex = contents.indexOf(`class ${className}`);
  if (classDeclarationIndex === -1) {
    return -1; // Class not found
  }

  let startIndex = contents.indexOf('{', classDeclarationIndex);

  if (startIndex === -1) {
    return -1; // Opening brace not found after class declaration
  }

  let braceCount = 1;
  // Iterate from after the opening brace to find the matching closing brace
  for (let i = startIndex + 1; i < contents.length; i++) {
    if (contents[i] === '{') {
      braceCount++;
    } else if (contents[i] === '}') {
      braceCount--;
    }

    if (braceCount === 0) {
      // Found the matching closing brace. Return its index.
      return i;
    }
  }

  return -1; // Matching closing brace not found (malformed file)
}
