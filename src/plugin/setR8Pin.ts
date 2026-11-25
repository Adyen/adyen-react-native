// Copyright (c) 2026 Adyen N.V.

/**
 * R8 version pinned by default. Older R8 versions break native 3D Secure 2
 * payments in minified Android release builds, see docs/Compatibility.md.
 */
export const DEFAULT_R8_VERSION = '9.4.18';

const MARKER = '// @adyen/react-native: R8 pin, see docs/Compatibility.md';
const R8_CLASSPATH = /com\.android\.tools:r8:/;
const OWN_R8_CLASSPATH =
  /(classpath\((['"])com\.android\.tools:r8:)[^'"]*(\2\))/;
const VERSION = /^\d+\.\d+\.\d+$/;

/** Throws when `version` is not a plain `major.minor.patch` R8 version. */
export function assertValidR8Version(version: string): void {
  if (!VERSION.test(version)) {
    throw new Error(
      `Invalid R8 version "${version}". Use a version such as ${DEFAULT_R8_VERSION}.`
    );
  }
}

/** Index after the first `marker` at or after `from`, or the end of the text. */
function skipPast(text: string, marker: string, from: number): number {
  const end = text.indexOf(marker, from);
  return end === -1 ? text.length : end + marker.length;
}

/** Index after the quoted string that starts at `start`, or the end of the text. */
function skipString(text: string, start: number): number {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length && text[i] !== quote) {
    i += text[i] === '\\' ? 2 : 1;
  }
  return i + 1;
}

/** Index after the comment or quoted string that starts at `i`, or `i` when none does. */
function skipCommentOrString(text: string, i: number): number {
  const pair = text.slice(i, i + 2);
  if (pair === '//') return skipPast(text, '\n', i + 2);
  if (pair === '/*') return skipPast(text, '*/', i + 2);
  if (text[i] === '"' || text[i] === "'") return skipString(text, i);
  return i;
}

/**
 * Index of the `}` that closes the block opened by the `{` at `open`.
 * Quoted strings and comments are skipped. Returns -1 when the block is not closed.
 */
function findClosingBrace(text: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const next = skipCommentOrString(text, i);
    if (next !== i) {
      i = next;
      continue;
    }
    if (text[i] === '{') {
      depth++;
    } else if (text[i] === '}' && --depth === 0) {
      return i;
    }
    i++;
  }
  return -1;
}

/** Index of the `{` of a top-level block such as `pluginManagement {`, or -1. */
function findTopLevelBlock(text: string, name: string): number {
  const match = new RegExp(String.raw`^${name}\s*\{`, 'm').exec(text);
  return match ? match.index + match[0].length - 1 : -1;
}

/** Index of the first character of the line after `index`, or the end of the text. */
function startOfNextLine(text: string, index: number): number {
  const newline = text.indexOf('\n', index);
  return newline === -1 ? text.length : newline + 1;
}

/**
 * Pins R8 in `android/settings.gradle`, so the app builds with an R8 version that
 * works with native 3D Secure 2 whichever Android Gradle plugin it uses.
 *
 * - An R8 version the app pins itself is never changed.
 * - A pin from an earlier run gets the new version.
 * - Without a `buildscript` block, one is added after `pluginManagement`, where
 *   Gradle requires it. An existing `buildscript` block gets the classpath entry.
 * - Contents that cannot be patched safely are returned unchanged.
 */
export function setR8Pin(
  contents: string,
  version: string = DEFAULT_R8_VERSION
): string {
  assertValidR8Version(version);

  if (contents.includes(MARKER)) {
    return contents.replace(
      OWN_R8_CLASSPATH,
      (_match, start: string, _quote: string, end: string) =>
        `${start}${version}${end}`
    );
  }
  if (R8_CLASSPATH.test(contents)) {
    return contents;
  }

  const classpath = `classpath("com.android.tools:r8:${version}")`;

  const buildscript = findTopLevelBlock(contents, 'buildscript');
  if (buildscript !== -1) {
    const close = findClosingBrace(contents, buildscript);
    const body = close === -1 ? '' : contents.slice(buildscript, close);
    const dependencies = /dependencies\s*\{/.exec(body);
    if (!dependencies) {
      return contents;
    }
    const insertAt = startOfNextLine(
      contents,
      buildscript + dependencies.index + dependencies[0].length
    );
    return (
      contents.slice(0, insertAt) +
      `        ${MARKER}\n        ${classpath}\n` +
      contents.slice(insertAt)
    );
  }

  const block =
    `${MARKER}\n` +
    'buildscript {\n' +
    '    repositories {\n' +
    '        google()\n' +
    '        mavenCentral()\n' +
    '    }\n' +
    '    dependencies {\n' +
    `        ${classpath}\n` +
    '    }\n' +
    '}\n';

  const pluginManagement = findTopLevelBlock(contents, 'pluginManagement');
  if (pluginManagement === -1) {
    return `${block}\n${contents}`;
  }
  const close = findClosingBrace(contents, pluginManagement);
  if (close === -1) {
    return contents;
  }
  const insertAt = startOfNextLine(contents, close);
  const head = contents.slice(0, insertAt);
  const tail = contents.slice(insertAt);
  const before = head.endsWith('\n') ? '\n' : '\n\n';
  const after = tail === '' || tail.startsWith('\n') ? '' : '\n';
  return head + before + block + after + tail;
}
