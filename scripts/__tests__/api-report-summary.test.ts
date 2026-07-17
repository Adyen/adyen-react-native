// Copyright (c) 2026 Adyen N.V.

import { describe, expect, it } from '@jest/globals';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const SCRIPT = resolve(__dirname, '../api-report-summary.js');

type Result = {
  changed: string;
  diff: string;
  summary: string;
};

function run(base: string | undefined, head: string): Result {
  const directory = mkdtempSync(join(tmpdir(), 'api-report-summary-'));
  const basePath = join(directory, 'base.md');
  const headPath = join(directory, 'head.md');
  const outputPath = join(directory, 'output');

  try {
    if (base !== undefined) writeFileSync(basePath, base);
    writeFileSync(headPath, head);

    const result = spawnSync(
      'node',
      [SCRIPT, base === undefined ? basePath : basePath, headPath, outputPath],
      { encoding: 'utf8' }
    );

    expect(result.status).toBe(0);

    return {
      changed: readFileSync(join(outputPath, 'changed.txt'), 'utf8'),
      diff: readFileSync(join(outputPath, 'diff.txt'), 'utf8'),
      summary: readFileSync(join(outputPath, 'summary.md'), 'utf8'),
    };
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

describe('api-report-summary.js', () => {
  it('reports an unchanged API', () => {
    const report = `// @public
export interface Existing {
    value: string;
}
`;

    const result = run(report, report);

    expect(result.changed).toBe('false');
    expect(result.diff).toBe('');
    expect(result.summary).toContain('Public API is unchanged');
  });

  it('groups added, removed, modified, and renamed declarations', () => {
    const base = `// @public
export interface Existing {
    value: string;
}

// @public
export interface Removed {
    removed: number;
}

// @public
export interface OldName {
    renamed: boolean;
}
`;
    const head = `// @public
export interface Existing {
    value: number;
}

// @public
export interface Added {
    added: string;
}

// @public
export interface NewName {
    renamed: boolean;
}
`;

    const result = run(base, head);

    expect(result.changed).toBe('true');
    expect(result.summary).toContain('Added (1)');
    expect(result.summary).toContain('`Added`');
    expect(result.summary).toContain('Removed (1)');
    expect(result.summary).toContain('`Removed`');
    expect(result.summary).toContain('Modified (1)');
    expect(result.summary).toContain('`Existing`');
    expect(result.summary).toContain('Renamed (1)');
    expect(result.summary).toContain('`OldName` → `NewName`');
    expect(result.diff).toContain('-    value: string;');
    expect(result.diff).toContain('+    value: number;');
  });

  it('treats a missing baseline as an empty API report', () => {
    const head = `// @public
export interface Added {
    value: string;
}
`;

    const result = run(undefined, head);

    expect(result.changed).toBe('true');
    expect(result.summary).toContain('Added (1)');
    expect(result.diff).toContain('+// @public');
  });

  it('fails when report paths are omitted', () => {
    const result = spawnSync('node', [SCRIPT], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: api-report-summary.js');
  });
});
