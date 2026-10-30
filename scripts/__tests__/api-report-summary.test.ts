// Copyright (c) 2026 Adyen N.V.

import { describe, expect, it } from '@jest/globals';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const SCRIPT = resolve(__dirname, '../api-report-summary.js');

const RUNNER_FILE_VARIABLES = [
  'GITHUB_ENV',
  'GITHUB_OUTPUT',
  'GITHUB_STEP_SUMMARY',
];

type Options = {
  githubOutput?: boolean;
  githubStepSummary?: boolean;
};

type Result = {
  changed: boolean;
  diff: string;
  githubOutput?: string;
  githubStepSummary?: string;
  stdout: string;
  summary: string;
};

function isolatedEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of RUNNER_FILE_VARIABLES) delete env[key];

  return env;
}

function run(
  base: string | undefined,
  head: string,
  { githubOutput = false, githubStepSummary = false }: Options = {}
): Result {
  const directory = mkdtempSync(join(tmpdir(), 'api-report-summary-'));
  const basePath = join(directory, 'base.md');
  const missingBasePath = join(directory, 'missing-base.md');
  const headPath = join(directory, 'head.md');
  const outputPath = join(directory, 'output');
  const githubOutputPath = join(directory, 'github-output.txt');
  const githubStepSummaryPath = join(directory, 'github-step-summary.md');

  try {
    if (base !== undefined) writeFileSync(basePath, base);
    writeFileSync(headPath, head);
    const env = isolatedEnv();
    if (githubOutput) env.GITHUB_OUTPUT = githubOutputPath;
    if (githubStepSummary) env.GITHUB_STEP_SUMMARY = githubStepSummaryPath;

    const result = spawnSync(
      'node',
      [
        SCRIPT,
        base === undefined ? missingBasePath : basePath,
        headPath,
        outputPath,
      ],
      { encoding: 'utf8', env }
    );

    expect(result.status).toBe(0);

    return {
      ...JSON.parse(readFileSync(join(outputPath, 'report.json'), 'utf8')),
      githubOutput: githubOutput
        ? readFileSync(githubOutputPath, 'utf8')
        : undefined,
      githubStepSummary:
        githubStepSummary && existsSync(githubStepSummaryPath)
          ? readFileSync(githubStepSummaryPath, 'utf8')
          : undefined,
      stdout: result.stdout,
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

    expect(result.changed).toBe(false);
    expect(result.diff).toBe('');
    expect(result.summary).toContain('Public API is unchanged');
  });

  it('normalizes CRLF line endings', () => {
    const report = `// @public
export interface Existing {
    value: string;
}
`;

    const result = run(report, report.replace(/\n/g, '\r\n'));

    expect(result.changed).toBe(false);
    expect(result.summary).toContain('Public API is unchanged');
  });

  it('ignores API Extractor comments when comparing declarations', () => {
    const base = `// @public
export interface ApplePayModule {
    // Warning: (generated-warning) The declaration needs to be updated
    //
    provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}
`;
    const head = `// @public
export interface ApplePayModule {
    provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}
`;

    const result = run(base, head);

    expect(result.changed).toBe(false);
    expect(result.summary).toContain('Public API is unchanged');
  });

  it('retains non-generated comments when comparing declarations', () => {
    const base = `// @public
export interface ApplePayModule {
    // This comment is part of the declaration contract.
    provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}
`;
    const head = `// @public
export interface ApplePayModule {
    provideAuthorizationResult(result: ApplePayAuthorizationResult): void;
}
`;

    const result = run(base, head);

    expect(result.changed).toBe(true);
    expect(result.summary).toContain('Modified (1)');
  });

  it('writes the changed state to GITHUB_OUTPUT', () => {
    const report = `// @public
export interface Existing {
    value: string;
}
`;

    const result = run(report, report, { githubOutput: true });

    expect(result.githubOutput).toBe('changed=false\n');
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

    expect(result.changed).toBe(true);
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

  it('identifies class, interface, method, parameter, and enum-case changes', () => {
    const base = `// @public
export class ExistingClass {
    keep(kept: string, removedParameter: number): void;
    removedMethod(): void;
}

// @public
export interface ExistingInterface {
    existingMethod(): void;
}

// @public
export enum ExistingEnum {
    Existing,
    RemovedCase
}

// @public
export class RemovedClass {
    removed: string;
}

// @public
export interface RemovedInterface {
    removed: string;
}
`;
    const head = `// @public
export class ExistingClass {
    keep(kept: string, addedParameter: boolean): void;
    addedMethod(): void;
}

// @public
export interface ExistingInterface {
    existingMethod(): void;
    addedMethod(): void;
}

// @public
export enum ExistingEnum {
    Existing,
    AddedCase
}

// @public
export class AddedClass {
    added: string;
}

// @public
export interface AddedInterface {
    added: string;
}
`;

    const result = run(base, head);

    expect(result.summary).toContain('### 🆕 Added (2)');
    expect(result.summary).toContain('`AddedClass`');
    expect(result.summary).toContain('`AddedInterface`');
    expect(result.summary).toContain('### ❌ Removed (2)');
    expect(result.summary).toContain('`RemovedClass`');
    expect(result.summary).toContain('`RemovedInterface`');
    expect(result.summary).toContain('### 🆕 Methods added (2)');
    expect(result.summary).toContain('`ExistingClass.addedMethod`');
    expect(result.summary).toContain('`ExistingInterface.addedMethod`');
    expect(result.summary).toContain('### ❌ Methods removed (1)');
    expect(result.summary).toContain('`ExistingClass.removedMethod`');
    expect(result.summary).toContain('### 🆕 Parameters added (1)');
    expect(result.summary).toContain('`ExistingClass.keep(addedParameter)`');
    expect(result.summary).toContain('### ❌ Parameters removed (1)');
    expect(result.summary).toContain('`ExistingClass.keep(removedParameter)`');
    expect(result.summary).toContain('### 🆕 Enum cases added (1)');
    expect(result.summary).toContain('`ExistingEnum.AddedCase`');
    expect(result.summary).toContain('### ❌ Enum cases removed (1)');
    expect(result.summary).toContain('`ExistingEnum.RemovedCase`');
  });

  it('formats top-level function parameters without an extra dot', () => {
    const base = `// @public
export function submit(payment: string): void;
`;
    const head = `// @public
export function submit(payment: string, configuration: string): void;
`;

    const result = run(base, head);

    expect(result.summary).toContain('`submit(configuration)`');
    expect(result.summary).not.toContain('`submit.(configuration)`');
  });

  it('treats a missing baseline as an empty API report', () => {
    const head = `// @public
export interface Added {
    value: string;
}
`;

    const result = run(undefined, head);

    expect(result.changed).toBe(true);
    expect(result.summary).toContain('Added (1)');
    expect(result.diff).toContain('+// @public');
  });

  it('prints the summary to stdout and skips the step summary when unchanged', () => {
    const report = `// @public
export interface Existing {
    value: string;
}
`;

    const result = run(report, report, {
      githubOutput: true,
      githubStepSummary: true,
    });

    expect(result.stdout).toContain('🟢 Public API is unchanged');
    expect(result.githubStepSummary).toBeUndefined();
    expect(result.githubOutput).toBe('changed=false\n');
  });

  it('prints the summary to stdout and the step summary when changed', () => {
    const base = `// @public
export interface Existing {
    value: string;
}
`;
    const head = `${base}
// @public
export interface Added {
    added: string;
}
`;

    const result = run(base, head, {
      githubOutput: true,
      githubStepSummary: true,
    });

    expect(result.stdout).toContain('🟡 Public API changes detected');
    expect(result.stdout).toContain('`Added`');
    expect(result.stdout).toBe(`${result.summary}\n`);
    expect(result.githubStepSummary).toBe(`${result.summary}\n\n`);
    expect(result.githubOutput).toBe('changed=true\n');
  });

  it('does not write to a GITHUB_STEP_SUMMARY inherited from the test process', () => {
    const directory = mkdtempSync(join(tmpdir(), 'api-report-inherited-'));
    const inheritedSummaryPath = join(directory, 'step-summary.md');
    const previous = process.env.GITHUB_STEP_SUMMARY;
    writeFileSync(inheritedSummaryPath, '');
    process.env.GITHUB_STEP_SUMMARY = inheritedSummaryPath;

    try {
      const result = run(
        `// @public
export interface Existing {
    value: string;
}
`,
        `// @public
export interface Existing {
    value: number;
}
`
      );

      expect(result.changed).toBe(true);
      expect(readFileSync(inheritedSummaryPath, 'utf8')).toBe('');
    } finally {
      if (previous === undefined) delete process.env.GITHUB_STEP_SUMMARY;
      else process.env.GITHUB_STEP_SUMMARY = previous;
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('fails when report paths are omitted', () => {
    const result = spawnSync('node', [SCRIPT], {
      encoding: 'utf8',
      env: isolatedEnv(),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: api-report-summary.js');
  });
});
