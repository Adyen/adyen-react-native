import { describe, expect, it } from '@jest/globals';
import { spawnSync } from 'child_process';
import * as path from 'path';

const SCRIPT = path.resolve(__dirname, '../xccov-to-sonarqube-generic.swift');

function run(
  input: string,
  args: string[] = []
): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('swift', [SCRIPT, ...args], {
    input,
    encoding: 'utf8',
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

const itMacOS = process.platform === 'darwin' ? it : it.skip;

describe('xccov-to-sonarqube-generic.swift', () => {
  itMacOS('converts covered and uncovered lines, skips non-executable', () => {
    const input = `/base/ios/Foo.swift:\n   1: *\n   2: 0\n   3: 2\n\n`;
    const { stdout, status } = run(input, [
      '--filter',
      '/base/ios',
      '--strip',
      '/base/',
    ]);
    expect(status).toBe(0);
    expect(stdout).toBe(
      '<?xml version="1.0"?>\n' +
        '<coverage version="1">\n' +
        '  <file path="ios/Foo.swift">\n' +
        '    <lineToCover lineNumber="2" covered="false"/>\n' +
        '    <lineToCover lineNumber="3" covered="true"/>\n' +
        '  </file>\n' +
        '</coverage>\n'
    );
  });

  itMacOS('handles branch coverage lines (count followed by "[")', () => {
    const input =
      `/base/ios/Bar.swift:\n` +
      `   1: 2 [\n(52, 0, 0)\n]\n` +
      `   2: 0 [\n(10, 0, 2)\n]\n` +
      `   3: *\n\n`;
    const { stdout, status } = run(input, [
      '--filter',
      '/base/ios',
      '--strip',
      '/base/',
    ]);
    expect(status).toBe(0);
    expect(stdout).toContain('<lineToCover lineNumber="1" covered="true"/>');
    expect(stdout).toContain('<lineToCover lineNumber="2" covered="false"/>');
    expect(stdout).not.toContain('lineNumber="3"');
  });

  itMacOS('filters out files not matching --filter prefix', () => {
    const input =
      `/base/ios/Keep.swift:\n   1: 1\n\n` +
      `/base/Pods/SomeLib/Skip.swift:\n   1: 1\n\n`;
    const { stdout } = run(input, [
      '--filter',
      '/base/ios',
      '--strip',
      '/base/',
    ]);
    expect(stdout).toContain('ios/Keep.swift');
    expect(stdout).not.toContain('Pods/SomeLib/Skip.swift');
  });

  itMacOS('escapes & in file paths to &amp;', () => {
    const input = `/base/ios/A&B.swift:\n   1: 1\n\n`;
    const { stdout } = run(input, [
      '--filter',
      '/base/ios',
      '--strip',
      '/base/',
    ]);
    expect(stdout).toContain('path="ios/A&amp;B.swift"');
  });

  itMacOS('omits files where all lines are non-executable', () => {
    const input = `/base/ios/Comments.swift:\n   1: *\n   2: *\n\n`;
    const { stdout } = run(input, [
      '--filter',
      '/base/ios',
      '--strip',
      '/base/',
    ]);
    expect(stdout).not.toContain('<file');
  });

  itMacOS('without --filter keeps all files', () => {
    const input =
      `/base/ios/Foo.swift:\n   1: 0\n\n` +
      `/base/Pods/Bar.swift:\n   1: 1\n\n`;
    const { stdout } = run(input, ['--strip', '/base/']);
    expect(stdout).toContain('ios/Foo.swift');
    expect(stdout).toContain('Pods/Bar.swift');
  });

  itMacOS('exits with error for unknown argument', () => {
    const { stderr, status } = run('', ['--unknown']);
    expect(status).not.toBe(0);
    expect(stderr).toContain('unexpected argument');
  });

  itMacOS('exits with error when --filter has no value', () => {
    const { stderr, status } = run('', ['--filter']);
    expect(status).not.toBe(0);
    expect(stderr).toContain('--filter requires an argument');
  });
});
