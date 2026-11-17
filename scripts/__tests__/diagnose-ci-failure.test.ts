// Copyright (c) 2026 Adyen N.V.

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const SCRIPT = resolve(__dirname, '../diagnose-ci-failure.js');
const script = require('../diagnose-ci-failure');

const REPO = 'Adyen/adyen-react-native';
const RUN_ID = '41096464630';

type FakeJob = {
  id: number;
  name: string;
  conclusion: string | null;
  html_url?: string;
};

type GhCall = string[];

type FakeGhOptions = {
  jobsPages: FakeJob[][];
  logs?: Record<number, string | Error>;
  jobsError?: Error;
};

let workDir: string;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'diagnose-ci-failure-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function job(id: number, name: string, conclusion: string | null): FakeJob {
  return {
    id,
    name,
    conclusion,
    html_url: `https://github.com/${REPO}/actions/runs/${RUN_ID}/job/${id}`,
  };
}

function fakeGh({ jobsPages, logs = {}, jobsError }: FakeGhOptions) {
  const calls: GhCall[] = [];
  const runGh = (args: string[]): string => {
    calls.push(args);
    const endpoint = args.find((arg) => arg.startsWith('repos/')) ?? '';
    if (endpoint.includes('/jobs?')) {
      if (jobsError) throw jobsError;
      const pages = jobsPages.map((jobs, index) => ({
        total_count: jobsPages.flat().length,
        jobs,
        page: index + 1,
      }));
      return JSON.stringify(pages);
    }
    const match = endpoint.match(/\/actions\/jobs\/(\d+)\/logs$/);
    if (!match) throw new Error(`unexpected gh call: ${args.join(' ')}`);
    const log = logs[Number(match[1])];
    if (log instanceof Error) throw log;
    if (log === undefined) throw new Error(`no log for ${match[1]}`);
    return log;
  };
  return { runGh, calls };
}

function stamp(lines: string[]): string {
  return lines
    .map((line, i) => {
      const minutes = String(Math.floor(i / 60) % 60).padStart(2, '0');
      const seconds = String(i % 60).padStart(2, '0');
      return `2026-10-30T17:${minutes}:${seconds}.1234567Z ${line}`;
    })
    .join('\n');
}

function numbered(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
}

const BLOCKING_LOG = stamp([
  '##[group]Run build-android.sh',
  'Task :app:compileDebugKotlin',
  'e: Unresolved reference: foo',
  'BUILD FAILED in 3m 25s',
  "##[error]The process '/usr/bin/sh' failed with exit code 1",
  '##[group]Terminate Emulator',
  'Post job cleanup.',
  'In post-action step',
  'Cleaning up orphan processes',
]);

const ALLOWED_LOG = stamp([
  'Running e2e tests',
  '1) payment flow failed',
  "##[error]The process '/usr/bin/sh' failed with exit code 1",
  '##[group]Run echo "::error title=Non-blocking failure::Android e2e test for expo latest failed. Non-blocking, but needs investigation."',
  '##[endgroup]',
  '##[error]Android e2e test for expo latest failed. Non-blocking, but needs investigation.',
  'Post job cleanup.',
  'Cleanup tail noise',
]);

function readJobsJson(outDir: string) {
  return JSON.parse(readFileSync(join(outDir, 'jobs.json'), 'utf8'));
}

describe('selectFailedJobs', () => {
  it('selects failed React Native, Expo and Android AGP 9 jobs, including timed_out', () => {
    const jobs = [
      job(1, 'Build lib / Build', 'failure'),
      job(2, 'React Native (0.79.7) / Android Test', 'failure'),
      job(3, 'Expo (latest, true) / Android Test', 'failure'),
      job(4, 'Android AGP 9 (builtin-kotlin, latest) / Build', 'failure'),
      job(5, 'React Native (0.80.0) / iOS Test', 'timed_out'),
      job(6, 'React Native (0.81.0) / iOS Test', 'success'),
      job(7, 'Expo (0.79.7) / iOS Test', 'skipped'),
      job(8, 'Expo (0.80.0) / iOS Test', 'cancelled'),
      job(9, 'Android Tests / Unit', 'failure'),
      job(10, 'Sonar', 'failure'),
      job(11, 'Diagnose E2E failure / diagnose', 'failure'),
      job(12, 'React Native (0.82.0) / Android Test', null),
    ];

    expect(script.selectFailedJobs(jobs).map((j: FakeJob) => j.id)).toEqual([
      2, 3, 4, 5,
    ]);
  });
});

describe('isAllowedFailure', () => {
  it('uses the Non-blocking marker from the log first', () => {
    expect(
      script.isAllowedFailure(
        'React Native (0.79.7) / Android Test',
        ALLOWED_LOG
      )
    ).toBe(true);
  });

  it('falls back to the ", true)" matrix suffix when the log has no marker', () => {
    expect(
      script.isAllowedFailure(
        'Expo (latest, true) / Android Test',
        BLOCKING_LOG
      )
    ).toBe(true);
    expect(
      script.isAllowedFailure('Expo (latest, true) / Android Test', undefined)
    ).toBe(true);
  });

  it('treats everything else as blocking', () => {
    expect(
      script.isAllowedFailure(
        'React Native (0.79.7) / Android Test',
        BLOCKING_LOG
      )
    ).toBe(false);
    expect(
      script.isAllowedFailure('React Native (0.79.7) / Android Test', undefined)
    ).toBe(false);
  });
});

describe('extractExcerpt', () => {
  it('centres on ##[error] context and drops the post-job cleanup tail', () => {
    const excerpt = script.extractExcerpt(BLOCKING_LOG);

    expect(excerpt).toContain('e: Unresolved reference: foo');
    expect(excerpt).toContain("##[error]The process '/usr/bin/sh' failed");
    expect(excerpt).not.toContain('Post job cleanup.');
    expect(excerpt).not.toContain('Cleaning up orphan processes');
  });

  it('strips timestamps, BOM and ANSI colour codes', () => {
    const log = `\uFEFF${stamp(['\u001b[36;1mrun thing\u001b[0m', '##[error]boom'])}`;

    const excerpt = script.extractExcerpt(log);

    expect(excerpt).toBe('run thing\n##[error]boom');
  });

  it('takes 80 lines before and 10 lines after an error', () => {
    const log = stamp([
      ...numbered('before', 100),
      '##[error]boom',
      ...numbered('after', 30),
    ]);

    const lines = script.extractExcerpt(log).split('\n');

    expect(lines[0]).toBe('before 21');
    expect(lines).toContain('##[error]boom');
    expect(lines[lines.length - 1]).toBe('after 10');
    expect(lines).toHaveLength(80 + 1 + 10);
  });

  it('merges overlapping windows without duplicating lines', () => {
    const log = stamp([
      ...numbered('a', 5),
      '##[error]first',
      ...numbered('b', 5),
      '##[error]second',
      ...numbered('c', 5),
    ]);

    const excerpt: string = script.extractExcerpt(log);
    const lines = excerpt.split('\n');

    expect(lines).toHaveLength(5 + 1 + 5 + 1 + 5);
    expect(new Set(lines).size).toBe(lines.length);
    expect(excerpt).not.toContain('omitted');
  });

  it('marks the gap between distant windows', () => {
    const log = stamp([
      ...numbered('a', 3),
      '##[error]first',
      ...numbered('gap', 300),
      '##[error]second',
    ]);

    const excerpt: string = script.extractExcerpt(log);

    expect(excerpt).toContain('##[error]first');
    expect(excerpt).toContain('##[error]second');
    expect(excerpt).toMatch(/\[\.\.\. \d+ lines omitted \.\.\.\]/);
    expect(excerpt).not.toContain('gap 100\n');
  });

  it('ignores the Non-blocking marker error but keeps the real error', () => {
    const excerpt: string = script.extractExcerpt(ALLOWED_LOG);

    expect(excerpt).toContain('1) payment flow failed');
    expect(excerpt).toContain("##[error]The process '/usr/bin/sh' failed");
    expect(excerpt).not.toContain('Cleanup tail noise');
  });

  it('falls back to the last meaningful lines before post-job cleanup without errors', () => {
    const log = stamp([
      ...numbered('work', 400),
      '',
      'last line before cleanup',
      'Post job cleanup.',
      'cleanup noise',
    ]);

    const lines = script.extractExcerpt(log).split('\n');

    expect(lines[lines.length - 1]).toBe('last line before cleanup');
    expect(lines).not.toContain('cleanup noise');
    expect(lines).not.toContain('work 1');
    expect(lines.length).toBeLessThanOrEqual(151);
  });

  it('falls back to the tail when the only error is the Non-blocking marker', () => {
    const log = stamp([
      'step output 1',
      'step output 2',
      '##[group]Run echo "::error title=Non-blocking failure::x. Non-blocking, but needs investigation."',
      'env: BIG_ENV_DUMP',
      '##[error]x. Non-blocking, but needs investigation.',
      'Post job cleanup.',
    ]);

    const excerpt: string = script.extractExcerpt(log);

    expect(excerpt).toContain('step output 2');
    expect(excerpt).not.toContain('BIG_ENV_DUMP');
    expect(excerpt).not.toContain('##[error]x. Non-blocking');
  });

  it('enforces the byte cap, keeps the end and adds a truncation marker', () => {
    const big = Array.from(
      { length: 400 },
      (_, i) => `line ${i} ${'x'.repeat(200)}`
    );
    const log = stamp([...big, '##[error]boom']);

    const excerpt: string = script.extractExcerpt(log, { maxBytes: 5000 });

    expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(5000);
    expect(excerpt.split('\n')[0]).toMatch(
      /^\[\.\.\. truncated \d+ lines \.\.\.\]$/
    );
    expect(excerpt.endsWith('##[error]boom')).toBe(true);
  });

  it('returns an empty string for an empty log', () => {
    expect(script.extractExcerpt('')).toBe('');
  });

  describe('byte budget with error anchors', () => {
    const wide = (prefix: string, count: number, width = 200) =>
      Array.from(
        { length: count },
        (_, i) => `${prefix} ${i + 1} ${'x'.repeat(width)}`
      );

    it('keeps every error window with its anchor and closest context when windows exceed the cap', () => {
      const log = stamp([
        ...wide('first-before', 90),
        '##[error]first failure',
        ...wide('first-after', 10),
        ...wide('gap', 300),
        ...wide('second-before', 90),
        '##[error]second failure',
        ...wide('second-after', 10),
        ...wide('gap2', 300),
        ...wide('third-before', 90),
        '##[error]third failure',
        ...wide('third-after', 10),
      ]);

      const excerpt: string = script.extractExcerpt(log, { maxBytes: 12000 });

      expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(12000);
      for (const name of ['first', 'second', 'third']) {
        expect(excerpt).toContain(`##[error]${name} failure`);
        expect(excerpt).toContain(`${name}-before 90 `);
        expect(excerpt).toContain(`${name}-before 89 `);
        expect(excerpt).not.toContain(`${name}-before 1 `);
      }
      expect(excerpt).toMatch(/\[\.\.\. truncated \d+ lines \.\.\.\]/);
    });

    it('trims context farthest from the anchor first and keeps lines in log order', () => {
      const log = stamp([
        ...wide('before', 80),
        '##[error]boom',
        ...wide('after', 10),
      ]);

      const lines: string[] = script
        .extractExcerpt(log, { maxBytes: 4000 })
        .split('\n');

      const anchor = lines.indexOf('##[error]boom');
      expect(anchor).toBeGreaterThan(0);
      expect(lines[anchor - 1]).toMatch(/^before 80 /);
      expect(lines[anchor + 1]).toMatch(/^after 1 /);
      const numbers = lines
        .map((line) => line.match(/^before (\d+) /))
        .filter((match): match is RegExpMatchArray => match !== null)
        .map((match) => Number(match[1]));
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
      expect(numbers[numbers.length - 1]).toBe(80);
      expect(numbers[0]).toBeGreaterThan(60);
      expect(lines[0]).toMatch(/^\[\.\.\. truncated \d+ lines \.\.\.\]$/);
    });

    it('keeps the error when long post-error lines would consume the budget', () => {
      const log = stamp([
        ...numbered('before', 30),
        '##[error]boom',
        ...wide('after', 10, 1990),
      ]);

      const excerpt: string = script.extractExcerpt(log, { maxBytes: 12800 });

      expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(12800);
      expect(excerpt).toContain('##[error]boom');
      expect(excerpt).toContain('before 30\n##[error]boom');
      expect(excerpt).toContain('before 29\nbefore 30\n##[error]boom');
      expect(excerpt).toMatch(/\[\.\.\. truncated \d+ lines \.\.\.\]/);
    });

    it('keeps a single error near the start of a huge log with its context', () => {
      const log = stamp([
        'job start',
        'setup',
        '##[error]early failure',
        ...wide('tail', 20000),
      ]);

      const excerpt: string = script.extractExcerpt(log);

      expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(
        script.EXCERPT_MAX_BYTES
      );
      expect(
        excerpt.startsWith('job start\nsetup\n##[error]early failure\n')
      ).toBe(true);
      expect(excerpt).toContain('tail 10 ');
      expect(excerpt).not.toContain('tail 11 ');
      expect(excerpt).not.toContain('omitted');
    });

    it('keeps the anchor and closest context of every window under a tiny cap', () => {
      const log = stamp([
        ...wide('a', 20),
        '##[error]one',
        ...wide('gap', 200),
        ...wide('b', 20),
        '##[error]two',
        ...wide('c', 5),
      ]);

      const excerpt: string = script.extractExcerpt(log, { maxBytes: 1500 });

      expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(1500);
      expect(excerpt).toContain('a 20 ');
      expect(excerpt).toContain('##[error]one');
      expect(excerpt).toContain('b 20 ');
      expect(excerpt).toContain('##[error]two');
      expect(excerpt).toMatch(/\[\.\.\. truncated \d+ lines \.\.\.\]/);
    });

    it('keeps every anchor of a merged window before dropping context', () => {
      const log = stamp([
        ...wide('ctx', 40),
        '##[error]first',
        ...wide('mid', 5),
        '##[error]second',
        ...wide('post', 10),
      ]);

      const excerpt: string = script.extractExcerpt(log, { maxBytes: 2500 });

      expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(2500);
      expect(excerpt).toContain('##[error]first');
      expect(excerpt).toContain('##[error]second');
      expect(excerpt).toContain('ctx 40 ');
    });

    it('keeps short preceding context of a later window when an earlier window has long lines that do not fit', () => {
      const early = Array.from({ length: 10 }, (_, i) => [
        `##[error]early ${i + 1} ${'x'.repeat(300)}`,
        ...wide(`early-ctx-${i + 1}`, 4, 300),
      ]).flat();
      const log = stamp([
        ...early,
        ...numbered('gap', 300),
        ...numbered('late-before', 20),
        '##[error]late failure',
        ...numbered('late-after', 5),
      ]);

      const excerpt: string = script.extractExcerpt(log, { maxBytes: 4000 });

      expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(4000);
      expect(excerpt).toContain('##[error]early 10 ');
      expect(excerpt).toContain('late-before 20\n##[error]late failure');
      expect(excerpt).toContain('late-before 19\nlate-before 20\n');
    });

    describe('when anchors alone exceed the cap', () => {
      const longAnchors = (count: number, width = 5000) =>
        Array.from({ length: count }, (_, i) => [
          `##[error]anchor ${i + 1} ${'e'.repeat(width)}`,
          ...numbered(`gap-${i + 1}`, 100),
        ]).flat();

      it('truncates over-long anchor lines and keeps the cap', () => {
        const log = stamp(['##[error]only ' + 'e'.repeat(10000)]);

        const excerpt: string = script.extractExcerpt(log, { maxBytes: 4000 });

        expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(4000);
        expect(excerpt).toContain('##[error]only ');
        expect(excerpt).toContain('[... line truncated ...]');
      });

      it('keeps anchors in priority order within the cap and reports the omitted ones with the log path', () => {
        const log = stamp(longAnchors(24));

        const excerpt: string = script.extractExcerpt(log, {
          maxBytes: 25 * 1024,
          logPath: '/tmp/out/logs/1.log',
        });

        expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(25 * 1024);
        expect(excerpt).toContain('##[error]anchor 1 ');
        const kept = excerpt.match(/##\[error\]anchor \d+ /g) ?? [];
        expect(kept.length).toBeGreaterThan(0);
        expect(kept.length).toBeLessThan(24);
        const marker = excerpt.match(
          /\[\.\.\. (\d+) more error lines omitted; see full log \/tmp\/out\/logs\/1\.log \.\.\.\]/
        );
        expect(marker).not.toBeNull();
        expect(Number(marker?.[1])).toBe(24 - kept.length);
        const numbers = kept.map((m) => Number(m.match(/\d+/)?.[0]));
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
      });

      it('does not add an omission marker when every anchor fits', () => {
        const log = stamp(longAnchors(3, 100));

        const excerpt: string = script.extractExcerpt(log, {
          maxBytes: 25 * 1024,
        });

        expect(excerpt).not.toContain('more error lines omitted');
      });
    });
  });
});

describe('capRawLog', () => {
  it('returns small logs unchanged', () => {
    expect(script.capRawLog('abc\ndef\n', 1000)).toBe('abc\ndef\n');
  });

  it('keeps the end of oversized logs on a line boundary with a marker', () => {
    const log = numbered('row', 2000).join('\n');

    const capped: string = script.capRawLog(log, 1000);

    expect(Buffer.byteLength(capped)).toBeLessThanOrEqual(1000);
    expect(capped.split('\n')[0]).toMatch(
      /^\[\.\.\. truncated \d+ bytes \.\.\.\]$/
    );
    expect(capped.endsWith('row 2000')).toBe(true);
    expect(capped.split('\n')[1]).toMatch(/^row \d+$/);
  });
});

describe('parseArgs', () => {
  it('parses collect arguments in both forms', () => {
    expect(
      script.parseArgs([
        'collect',
        '--repo',
        REPO,
        `--run-id=${RUN_ID}`,
        '--out-dir',
        '/tmp/out',
      ])
    ).toEqual({
      command: 'collect',
      repo: REPO,
      runId: RUN_ID,
      outDir: '/tmp/out',
    });
  });

  it.each([
    [[], 'missing command'],
    [['bogus'], 'unknown command'],
    [['collect', '--run-id', RUN_ID, '--out-dir', '/tmp/o'], 'missing --repo'],
    [['collect', '--repo', REPO, '--out-dir', '/tmp/o'], 'missing --run-id'],
    [['collect', '--repo', REPO, '--run-id', RUN_ID], 'missing --out-dir'],
    [
      ['collect', '--repo', 'nope', '--run-id', RUN_ID, '--out-dir', '/tmp/o'],
      'bad repo',
    ],
    [
      ['collect', '--repo', REPO, '--run-id', 'abc', '--out-dir', '/tmp/o'],
      'bad run id',
    ],
    [
      ['collect', '--repo', REPO, '--run-id', RUN_ID, '--out-dir'],
      'flag without value',
    ],
    [
      [
        'collect',
        '--repo',
        REPO,
        '--run-id',
        RUN_ID,
        '--out-dir',
        '/tmp/o',
        '--wat',
        'x',
      ],
      'unknown flag',
    ],
  ])('rejects %j (%s) with a usage error', (argv) => {
    expect(() => script.parseArgs(argv)).toThrow(script.UsageError);
  });
});

describe('CLI', () => {
  it('prints usage and exits non-zero on bad arguments', () => {
    const result = spawnSync('node', [SCRIPT, 'collect', '--repo', 'nope'], {
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Usage:');
  });

  it('exits non-zero without a command', () => {
    const result = spawnSync('node', [SCRIPT], { encoding: 'utf8' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Usage:');
  });
});

describe('collect', () => {
  function run(
    gh: ReturnType<typeof fakeGh>,
    extra: Record<string, unknown> = {}
  ) {
    const outDir = join(workDir, 'out');
    const githubOutput = join(workDir, 'github-output');
    writeFileSync(githubOutput, '');
    const result = script.collect(
      {
        repo: REPO,
        runId: RUN_ID,
        outDir,
        env: { GITHUB_OUTPUT: githubOutput },
        ...extra,
      },
      gh.runGh
    );
    return { result, outDir, githubOutput };
  }

  const standardJobs = [
    job(100, 'Build lib / Build', 'success'),
    job(124205245095, 'Expo (latest, true) / Android Test', 'failure'),
    job(124205419341, 'React Native (0.79.7) / Android Test', 'failure'),
    job(300, 'Android Tests / Unit', 'failure'),
  ];

  const standardLogs = {
    124205245095: ALLOWED_LOG,
    124205419341: BLOCKING_LOG,
  };

  it('lists failed jobs with classification and bundle-relative file paths in jobs.json', () => {
    const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });

    const { outDir, result } = run(gh);
    const jobs = readJobsJson(outDir);

    expect(result.failedJobs).toHaveLength(2);
    expect(jobs).toMatchObject({
      schemaVersion: 1,
      repo: REPO,
      runId: RUN_ID,
      runUrl: `https://github.com/${REPO}/actions/runs/${RUN_ID}`,
    });
    expect(jobs.failedJobs).toEqual([
      {
        id: 124205245095,
        name: 'Expo (latest, true) / Android Test',
        url: `https://github.com/${REPO}/actions/runs/${RUN_ID}/job/124205245095`,
        conclusion: 'failure',
        blocking: false,
        logFile: 'logs/124205245095.log',
        excerptFile: 'excerpts/124205245095.txt',
      },
      {
        id: 124205419341,
        name: 'React Native (0.79.7) / Android Test',
        url: `https://github.com/${REPO}/actions/runs/${RUN_ID}/job/124205419341`,
        conclusion: 'failure',
        blocking: true,
        logFile: 'logs/124205419341.log',
        excerptFile: 'excerpts/124205419341.txt',
      },
    ]);
    for (const failedJob of jobs.failedJobs) {
      expect(existsSync(join(outDir, failedJob.logFile))).toBe(true);
      expect(existsSync(join(outDir, failedJob.excerptFile))).toBe(true);
    }
  });

  it('never writes prompt.md, droid.json or a report', () => {
    const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });

    const { outDir } = run(gh);

    expect(readdirSync(outDir).sort()).toEqual([
      'excerpts',
      'jobs.json',
      'logs',
    ]);
  });

  it('writes raw logs and focused excerpts', () => {
    const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });

    const { outDir } = run(gh);

    expect(readFileSync(join(outDir, 'logs', '124205419341.log'), 'utf8')).toBe(
      BLOCKING_LOG
    );
    const excerpt = readFileSync(
      join(outDir, 'excerpts', '124205419341.txt'),
      'utf8'
    );
    expect(excerpt).toContain('Unresolved reference: foo');
    expect(excerpt).not.toContain('Post job cleanup.');
    expect(excerpt).not.toMatch(/^2026-/m);
  });

  it('requests logs through the jobs logs API, not gh run view', () => {
    const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });

    run(gh);

    const endpoints = gh.calls.map((args) => args.join(' '));
    expect(
      endpoints.some((e) => e.includes('actions/jobs/124205419341/logs'))
    ).toBe(true);
    expect(endpoints.some((e) => e.includes('run view'))).toBe(false);
  });

  it('writes has_failures and failed_count to GITHUB_OUTPUT', () => {
    const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });

    const { githubOutput } = run(gh);

    expect(readFileSync(githubOutput, 'utf8')).toBe(
      'has_failures=true\nfailed_count=2\n'
    );
  });

  it('is a clean no-op when no E2E job failed', () => {
    const gh = fakeGh({
      jobsPages: [
        [
          job(1, 'Build lib / Build', 'success'),
          job(2, 'React Native (0.79.7) / Android Test', 'success'),
          job(3, 'Expo (0.79.7) / Android Test', 'skipped'),
          job(4, 'Android Tests / Unit', 'failure'),
        ],
      ],
    });

    const { outDir, githubOutput, result } = run(gh);

    expect(result.failedJobs).toEqual([]);
    expect(readJobsJson(outDir).failedJobs).toEqual([]);
    expect(readJobsJson(outDir).schemaVersion).toBe(1);
    expect(existsSync(join(outDir, 'prompt.md'))).toBe(false);
    expect(readFileSync(githubOutput, 'utf8')).toBe(
      'has_failures=false\nfailed_count=0\n'
    );
    expect(gh.calls.some((args) => args.join(' ').includes('/logs'))).toBe(
      false
    );
  });

  it('works without GITHUB_OUTPUT', () => {
    const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });

    expect(() => run(gh, { env: {} })).not.toThrow();
  });

  it('records logError for a failed log fetch and keeps processing the rest', () => {
    const gh = fakeGh({
      jobsPages: [standardJobs],
      logs: {
        124205245095: new Error('HTTP 410: logs expired'),
        124205419341: BLOCKING_LOG,
      },
    });

    const { outDir, result, githubOutput } = run(gh);
    const jobs = readJobsJson(outDir).failedJobs;

    expect(result.failedJobs).toHaveLength(2);
    expect(jobs[0].logError).toContain('HTTP 410');
    expect(jobs[0].logFile).toBeNull();
    expect(jobs[0].excerptFile).toBeNull();
    expect(jobs[0].blocking).toBe(false);
    expect(jobs[1].logError).toBeUndefined();
    expect(existsSync(join(outDir, jobs[1].excerptFile))).toBe(true);
    expect(readFileSync(githubOutput, 'utf8')).toContain('failed_count=2');
    expect(existsSync(join(outDir, 'prompt.md'))).toBe(false);
  });

  it('follows pagination so more than 100 jobs are handled', () => {
    const filler = Array.from({ length: 100 }, (_, i) =>
      job(1000 + i, `Filler ${i}`, 'success')
    );
    const gh = fakeGh({
      jobsPages: [
        filler,
        [...filler.map((j) => ({ ...j, id: j.id + 1000 })), standardJobs[2]],
      ],
      logs: standardLogs,
    });

    const { result } = run(gh);

    expect(result.failedJobs.map((j: FakeJob) => j.id)).toEqual([124205419341]);
    const listCall = gh.calls.find((args) =>
      args.some((arg) => arg.includes('/jobs?'))
    ) as string[];
    expect(listCall).toContain('--paginate');
    expect(listCall.join(' ')).toContain(
      `repos/${REPO}/actions/runs/${RUN_ID}/jobs?per_page=100`
    );
  });

  it('also accepts concatenated page objects from gh --paginate', () => {
    const runGh = (args: string[]) => {
      if (args.some((arg) => arg.includes('/jobs?'))) {
        const page = (jobs: FakeJob[]) => JSON.stringify({ jobs });
        return page([standardJobs[0]]) + page([standardJobs[2]]);
      }
      return BLOCKING_LOG;
    };

    const result = script.collect(
      { repo: REPO, runId: RUN_ID, outDir: join(workDir, 'out'), env: {} },
      runGh
    );

    expect(result.failedJobs.map((j: FakeJob) => j.id)).toEqual([124205419341]);
  });

  it('throws when the jobs list cannot be fetched', () => {
    const gh = fakeGh({ jobsPages: [], jobsError: new Error('HTTP 403') });

    expect(() => run(gh)).toThrow('HTTP 403');
  });

  it('caps raw logs and excerpts per job and in total with truncation markers', () => {
    const jobs = Array.from({ length: 8 }, (_, i) =>
      job(500 + i, `React Native (0.${i}.0) / Android Test`, 'failure')
    );
    const hugeLines = Array.from(
      { length: 2000 },
      (_, i) => `line ${i} ${'y'.repeat(1500)}`
    );
    const huge = stamp([...hugeLines, '##[error]boom']);
    const logs = Object.fromEntries(jobs.map((j) => [j.id, huge]));
    const gh = fakeGh({ jobsPages: [jobs], logs });

    const { outDir } = run(gh);

    let total = 0;
    for (const j of jobs) {
      const excerptPath = join(outDir, 'excerpts', `${j.id}.txt`);
      const size = statSync(excerptPath).size;
      total += size;
      expect(size).toBeLessThanOrEqual(script.EXCERPT_MAX_BYTES);
      expect(readFileSync(excerptPath, 'utf8')).toContain('truncated');
      const rawSize = statSync(join(outDir, 'logs', `${j.id}.log`)).size;
      expect(rawSize).toBeLessThanOrEqual(script.RAW_LOG_MAX_BYTES);
    }
    expect(total).toBeLessThanOrEqual(script.TOTAL_EXCERPT_MAX_BYTES);
  });

  it('keeps every error anchor of every job when the total cap forces trimming', () => {
    const jobs = Array.from({ length: 10 }, (_, i) =>
      job(700 + i, `Expo (${i}.0.0) / Android Test`, 'failure')
    );
    const wide = (prefix: string, count: number) =>
      Array.from(
        { length: count },
        (_, i) => `${prefix} ${i + 1} ${'z'.repeat(300)}`
      );
    const logFor = (id: number) =>
      stamp([
        ...wide('one-before', 80),
        `##[error]first failure of ${id}`,
        ...wide('one-after', 10),
        ...wide('gap', 100),
        ...wide('two-before', 80),
        `##[error]second failure of ${id}`,
        ...wide('two-after', 10),
      ]);
    const logs = Object.fromEntries(jobs.map((j) => [j.id, logFor(j.id)]));
    const gh = fakeGh({ jobsPages: [jobs], logs });

    const { outDir } = run(gh);

    let total = 0;
    for (const j of jobs) {
      const excerpt = readFileSync(
        join(outDir, 'excerpts', `${j.id}.txt`),
        'utf8'
      );
      total += Buffer.byteLength(excerpt);
      expect(excerpt).toContain(`##[error]first failure of ${j.id}\n`);
      expect(excerpt).toContain(`##[error]second failure of ${j.id}\n`);
      expect(excerpt).toContain('one-before 80 ');
      expect(excerpt).toContain('two-before 80 ');
      expect(excerpt).toMatch(/\[\.\.\. truncated \d+ lines \.\.\.\]/);
    }
    expect(total).toBeLessThanOrEqual(script.TOTAL_EXCERPT_MAX_BYTES);
  });

  it('keeps both caps and at least one anchor per job when long anchors alone exceed the budget', () => {
    const jobs = Array.from({ length: 8 }, (_, i) =>
      job(900 + i, `React Native (0.${i}.0) / Android Test`, 'failure')
    );
    const logFor = (id: number) =>
      stamp(
        Array.from({ length: 24 }, (_, i) => [
          `##[error]anchor ${i + 1} of ${id} ${'e'.repeat(5000)}`,
          ...Array.from({ length: 100 }, (__, n) => `gap-${i + 1} ${n}`),
        ]).flat()
      );
    const logs = Object.fromEntries(jobs.map((j) => [j.id, logFor(j.id)]));
    const gh = fakeGh({ jobsPages: [jobs], logs });

    const { outDir } = run(gh);

    let total = 0;
    for (const j of jobs) {
      const excerpt = readFileSync(
        join(outDir, 'excerpts', `${j.id}.txt`),
        'utf8'
      );
      const size = Buffer.byteLength(excerpt);
      total += size;
      expect(size).toBeLessThanOrEqual(script.EXCERPT_MAX_BYTES);
      expect(excerpt).toContain(`##[error]anchor 1 of ${j.id} `);
      expect(excerpt).toContain('[... line truncated ...]');
      expect(excerpt).toContain(
        `more error lines omitted; see full log logs/${j.id}.log ...]`
      );
    }
    expect(total).toBeLessThanOrEqual(script.TOTAL_EXCERPT_MAX_BYTES);
  });
});

describe('main', () => {
  it('returns 0 for a successful collect and non-zero for usage errors', () => {
    const gh = fakeGh({
      jobsPages: [[job(1, 'Build lib / Build', 'success')]],
    });
    const quiet = { stderr: () => undefined, stdout: () => undefined };

    expect(
      script.main(
        [
          'collect',
          '--repo',
          REPO,
          '--run-id',
          RUN_ID,
          '--out-dir',
          join(workDir, 'out'),
        ],
        { runGh: gh.runGh, env: {}, ...quiet }
      )
    ).toBe(0);
    expect(
      script.main(['collect'], { runGh: gh.runGh, env: {}, ...quiet })
    ).not.toBe(0);
  });

  it('returns non-zero when the jobs list cannot be fetched', () => {
    const gh = fakeGh({ jobsPages: [], jobsError: new Error('HTTP 500') });
    const errors: string[] = [];

    const code = script.main(
      [
        'collect',
        '--repo',
        REPO,
        '--run-id',
        RUN_ID,
        '--out-dir',
        join(workDir, 'out'),
      ],
      {
        runGh: gh.runGh,
        env: {},
        stdout: () => undefined,
        stderr: (message: string) => errors.push(message),
      }
    );

    expect(code).not.toBe(0);
    expect(errors.join('\n')).toContain('HTTP 500');
  });
});

describe('real run 41096464630 fixtures', () => {
  const FIXTURES = join(__dirname, '__fixtures__', 'diagnose-ci-failure');
  const ALLOWED_ID = 124205245095;
  const BLOCKING_ID = 124205419341;

  const readFixture = (name: string) =>
    readFileSync(join(FIXTURES, name), 'utf8');
  const jobsListing = () => readFixture('jobs-run-41096464630.json');
  const allowedLog = () => readFixture('job-124205245095-allowed.log');
  const blockingLog = () => readFixture('job-124205419341-blocking.log');

  function realGh(jobsOutput: string) {
    return (args: string[]): string => {
      const endpoint = args.find((arg) => arg.startsWith('repos/')) ?? '';
      if (endpoint.includes('/jobs?')) return jobsOutput;
      if (endpoint.endsWith(`/jobs/${ALLOWED_ID}/logs`)) return allowedLog();
      if (endpoint.endsWith(`/jobs/${BLOCKING_ID}/logs`)) return blockingLog();
      throw new Error(`unexpected gh call: ${args.join(' ')}`);
    };
  }

  function collectReal(jobsOutput = jobsListing()) {
    const outDir = join(workDir, 'out');
    const githubOutput = join(workDir, 'github-output');
    writeFileSync(githubOutput, '');
    const result = script.collect(
      {
        repo: REPO,
        runId: RUN_ID,
        outDir,
        env: { GITHUB_OUTPUT: githubOutput },
      },
      realGh(jobsOutput)
    );
    return { result, outDir, githubOutput };
  }

  it('selects exactly the allowed and the blocking failed job from the real listing', () => {
    const jobs = script.parseJobPages(jobsListing());

    expect(jobs).toHaveLength(32);
    expect(script.selectFailedJobs(jobs).map((j: FakeJob) => j.id)).toEqual([
      ALLOWED_ID,
      BLOCKING_ID,
    ]);
  });

  it('parses the same jobs from slurped and concatenated paginated output', () => {
    const listing = JSON.parse(jobsListing());
    const half = Math.ceil(listing.jobs.length / 2);
    const pages = [
      { total_count: listing.total_count, jobs: listing.jobs.slice(0, half) },
      { total_count: listing.total_count, jobs: listing.jobs.slice(half) },
    ];
    const expected = listing.jobs.map((j: FakeJob) => j.id);

    const slurped = script.parseJobPages(JSON.stringify(pages));
    const concatenated = script.parseJobPages(
      pages.map((page) => JSON.stringify(page)).join('')
    );
    const pretty = script.parseJobPages(
      pages.map((page) => JSON.stringify(page, null, 2)).join('\n')
    );

    for (const parsed of [slurped, concatenated, pretty]) {
      expect(parsed.map((j: FakeJob) => j.id)).toEqual(expected);
    }
  });

  it('is not confused by braces inside job names or strings', () => {
    const tricky = JSON.stringify({
      jobs: [{ id: 1, name: 'weird } "{" \\ name', conclusion: 'success' }],
    });

    expect(script.parseJobPages(tricky + tricky)).toHaveLength(2);
  });

  it('classifies the allowed job as non-blocking and the blocking job as blocking', () => {
    const { outDir } = collectReal();
    const jobs = readJobsJson(outDir).failedJobs;

    expect(
      jobs.map((j: { id: number; blocking: boolean }) => [j.id, j.blocking])
    ).toEqual([
      [ALLOWED_ID, false],
      [BLOCKING_ID, true],
    ]);
    expect(allowedLog()).toContain('Non-blocking');
    expect(blockingLog()).not.toContain('Non-blocking');
  });

  it('does not treat Non-blocking text outside a ##[error] line as the marker', () => {
    const log = stamp([
      'Task :app:lint',
      'Non-blocking lint warnings were found',
      "##[error]The process '/usr/bin/sh' failed with exit code 1",
    ]);

    expect(
      script.isAllowedFailure('React Native (0.79.7) / Android Test', log)
    ).toBe(false);
  });

  it('writes jobs.json for exactly the two real failed jobs and a GITHUB_OUTPUT count', () => {
    const { outDir, githubOutput } = collectReal();
    const jobs = readJobsJson(outDir);

    expect(jobs.failedJobs.map((j: FakeJob) => j.id)).toEqual([
      ALLOWED_ID,
      BLOCKING_ID,
    ]);
    expect(jobs.failedJobs[0].url).toBe(
      `https://github.com/${REPO}/actions/runs/${RUN_ID}/job/${ALLOWED_ID}`
    );
    expect(readFileSync(githubOutput, 'utf8')).toBe(
      'has_failures=true\nfailed_count=2\n'
    );
  });

  it('centres the blocking job excerpt on the Gradle failure, not the cleanup tail', () => {
    const excerpt = script.extractExcerpt(blockingLog());

    expect(excerpt).toContain('BUILD FAILED in 3m 25s');
    expect(excerpt).toContain(
      "##[error]The process '/usr/bin/sh' failed with exit code 1"
    );
    expect(excerpt).toContain(
      "Dependency 'androidx.activity:activity-ktx:1.11.0' requires"
    );
    expect(excerpt).not.toContain('Post job cleanup.');
    expect(excerpt).not.toContain('Terminate orphan process');
    expect(excerpt).not.toMatch(/^2026-10-30T/m);
    expect(Buffer.byteLength(excerpt)).toBeLessThanOrEqual(
      script.EXCERPT_MAX_BYTES
    );
  });

  it('centres the allowed job excerpt on the toolchain failure and drops the marker', () => {
    const excerpt = script.extractExcerpt(allowedLog());

    expect(excerpt).toContain(
      'Error configuring Android toolchain: kotlin-gradle-plugin classpath not found in build.gradle'
    );
    expect(excerpt).toContain(
      "##[error]The process '/usr/bin/sh' failed with exit code 1"
    );
    expect(excerpt).not.toContain('Non-blocking');
    expect(excerpt).not.toContain('Post job cleanup.');
    expect(excerpt).not.toMatch(/^2026-10-30T/m);
  });

  it('writes a bundle with relative paths and no prompt for the real run', () => {
    const { outDir } = collectReal();
    const jobs = readJobsJson(outDir);

    expect(jobs.schemaVersion).toBe(1);
    expect(jobs.failedJobs.map((j: { logFile: string }) => j.logFile)).toEqual([
      `logs/${ALLOWED_ID}.log`,
      `logs/${BLOCKING_ID}.log`,
    ]);
    expect(
      jobs.failedJobs.map((j: { excerptFile: string }) => j.excerptFile)
    ).toEqual([`excerpts/${ALLOWED_ID}.txt`, `excerpts/${BLOCKING_ID}.txt`]);
    expect(existsSync(join(outDir, 'prompt.md'))).toBe(false);
  });
});

describe('dispatch', () => {
  const TARGET_REPO = 'Adyen/adyen-checkout-sdk-meta';
  const WORKFLOW = 'diagnose-react-native-e2e.yml';
  const WORKFLOW_PAGE = `https://github.com/${TARGET_REPO}/actions/workflows/${WORKFLOW}`;
  const ENDPOINT = `repos/${TARGET_REPO}/actions/workflows/${WORKFLOW}/dispatches`;
  const RUN_PAGE = `https://github.com/${TARGET_REPO}/actions/runs/777`;
  const TOKEN = 'ghs_synthetictoken1234567890';
  const BODY_MARKER = 'RESPONSE-BODY-MARKER-xyz';

  type FakeResponse = { status: number; body?: string };
  type DispatchCall = { args: string[]; input?: string };

  function httpResponse({ status, body = '' }: FakeResponse) {
    return `HTTP/2.0 ${status} Status\r\nContent-Type: application/json\r\n\r\n${body}`;
  }

  function fakeDispatchGh(responses: FakeResponse[]) {
    const calls: DispatchCall[] = [];
    const runGh = (args: string[], options: { input?: string } = {}) => {
      calls.push({ args, input: options.input });
      const response = responses[calls.length - 1];
      if (!response) throw new Error('unexpected extra gh call');
      const stdout = httpResponse(response);
      if (response.status >= 300) {
        const error = new Error(
          `gh api failed: ${response.body ?? ''} (HTTP ${response.status})`
        ) as Error & { stdout: string };
        error.stdout = stdout;
        throw error;
      }
      return stdout;
    };
    return { runGh, calls };
  }

  let githubOutput: string;

  beforeEach(() => {
    githubOutput = join(workDir, 'github-output');
    writeFileSync(githubOutput, '');
  });

  function runDispatch(
    gh: ReturnType<typeof fakeDispatchGh>,
    extra: Record<string, unknown> = {}
  ) {
    const result = script.dispatch(
      {
        runId: RUN_ID,
        targetRepo: TARGET_REPO,
        workflow: WORKFLOW,
        ref: 'develop',
        env: { GITHUB_OUTPUT: githubOutput, GH_TOKEN: TOKEN },
        ...extra,
      },
      gh.runGh
    );
    return { result, output: readFileSync(githubOutput, 'utf8') as string };
  }

  it('POSTs the workflow_dispatch body on stdin with return_run_details', () => {
    const gh = fakeDispatchGh([
      { status: 200, body: JSON.stringify({ html_url: RUN_PAGE }) },
    ]);

    runDispatch(gh);

    expect(gh.calls).toHaveLength(1);
    const { args, input } = gh.calls[0];
    expect(args).toContain('api');
    expect(args).toContain(ENDPOINT);
    expect(args[args.indexOf('-X') + 1]).toBe('POST');
    expect(args[args.indexOf('--input') + 1]).toBe('-');
    expect(JSON.parse(input as string)).toEqual({
      ref: 'develop',
      inputs: { run_id: RUN_ID },
      return_run_details: true,
    });
    expect(input).toBe(
      `{"ref":"develop","inputs":{"run_id":"${RUN_ID}"},"return_run_details":true}`
    );
    expect(args.join(' ')).not.toContain(TOKEN);
  });

  it('honours --target-repo, --workflow and --ref overrides', () => {
    const gh = fakeDispatchGh([{ status: 204 }]);

    runDispatch(gh, {
      targetRepo: 'Other/meta-repo',
      workflow: 'other.yaml',
      ref: 'release/1.x',
    });

    expect(gh.calls[0].args).toContain(
      'repos/Other/meta-repo/actions/workflows/other.yaml/dispatches'
    );
    expect(JSON.parse(gh.calls[0].input as string).ref).toBe('release/1.x');
  });

  it('reports requested with the html_url on HTTP 200 and makes one request', () => {
    const gh = fakeDispatchGh([
      {
        status: 200,
        body: JSON.stringify({
          workflow_run_id: 777,
          run_url: 'https://api.github.com/repos/x/actions/runs/777',
          html_url: RUN_PAGE,
        }),
      },
    ]);

    const { result, output } = runDispatch(gh);

    expect(gh.calls).toHaveLength(1);
    expect(result).toMatchObject({ status: 'requested', url: RUN_PAGE });
    expect(output).toBe(
      `dispatch_status=requested\ndispatch_url=${RUN_PAGE}\n`
    );
  });

  it('falls back to the workflow page when html_url is not a GitHub URL', () => {
    const gh = fakeDispatchGh([
      {
        status: 200,
        body: JSON.stringify({ html_url: 'https://evil.example/x\nfoo=bar' }),
      },
    ]);

    const { output } = runDispatch(gh);

    expect(output).toBe(
      `dispatch_status=requested\ndispatch_url=${WORKFLOW_PAGE}\n`
    );
  });

  it('treats HTTP 204 as success, links the workflow page and does not retry', () => {
    const gh = fakeDispatchGh([{ status: 204 }]);

    const { result, output } = runDispatch(gh);

    expect(gh.calls).toHaveLength(1);
    expect(result).toMatchObject({ status: 'requested', url: WORKFLOW_PAGE });
    expect(output).toBe(
      `dispatch_status=requested\ndispatch_url=${WORKFLOW_PAGE}\n`
    );
  });

  it('treats an unparseable 200 body as success with the workflow page link', () => {
    const gh = fakeDispatchGh([{ status: 200, body: 'not json' }]);

    const { output } = runDispatch(gh);

    expect(gh.calls).toHaveLength(1);
    expect(output).toContain('dispatch_status=requested');
    expect(output).toContain(`dispatch_url=${WORKFLOW_PAGE}`);
  });

  it('retries exactly once without return_run_details after HTTP 422', () => {
    const gh = fakeDispatchGh([
      { status: 422, body: 'Unexpected inputs' },
      { status: 204 },
    ]);

    const { output } = runDispatch(gh);

    expect(gh.calls).toHaveLength(2);
    expect(JSON.parse(gh.calls[1].input as string)).toEqual({
      ref: 'develop',
      inputs: { run_id: RUN_ID },
    });
    expect(output).toBe(
      `dispatch_status=requested\ndispatch_url=${WORKFLOW_PAGE}\n`
    );
  });

  it('fails when the 422 retry also fails, with at most two requests', () => {
    const gh = fakeDispatchGh([
      { status: 422, body: BODY_MARKER },
      { status: 422, body: BODY_MARKER },
      { status: 204 },
    ]);

    const { result, output } = runDispatch(gh);

    expect(gh.calls).toHaveLength(2);
    expect(result.status).toBe('failed');
    expect(output).toBe('dispatch_status=failed\n');
  });

  it.each([401, 403, 404, 500])(
    'does not retry HTTP %i and reports failed',
    (status) => {
      const gh = fakeDispatchGh([
        { status, body: BODY_MARKER },
        { status: 204 },
      ]);

      const { result, output } = runDispatch(gh);

      expect(gh.calls).toHaveLength(1);
      expect(result.status).toBe('failed');
      expect(output).toBe('dispatch_status=failed\n');
      expect(output).not.toContain('dispatch_url');
      expect(result.warning).toContain(String(status));
    }
  );

  it('reports failed when gh cannot run at all', () => {
    const runGh = () => {
      throw new Error(`gh could not run: spawn ENOENT ${TOKEN} ${BODY_MARKER}`);
    };

    const result = script.dispatch(
      {
        runId: RUN_ID,
        targetRepo: TARGET_REPO,
        workflow: WORKFLOW,
        ref: 'develop',
        env: { GITHUB_OUTPUT: githubOutput, GH_TOKEN: TOKEN },
      },
      runGh
    );

    expect(result.status).toBe('failed');
    expect(readFileSync(githubOutput, 'utf8')).toBe('dispatch_status=failed\n');
    expect(result.warning).not.toContain(TOKEN);
    expect(result.warning).not.toContain(BODY_MARKER);
  });

  describe('main', () => {
    function runMain(argv: string[], gh: ReturnType<typeof fakeDispatchGh>) {
      const out: string[] = [];
      const err: string[] = [];
      const code = script.main(argv, {
        runGh: gh.runGh,
        env: { GITHUB_OUTPUT: githubOutput, GH_TOKEN: TOKEN },
        stdout: (message: string) => out.push(message),
        stderr: (message: string) => err.push(message),
      });
      return { code, out: out.join('\n'), err: err.join('\n') };
    }

    it('exits 0 on failure with a ::warning:: that has the status but no body or token', () => {
      const gh = fakeDispatchGh([{ status: 403, body: BODY_MARKER }]);

      const { code, out, err } = runMain(['dispatch', '--run-id', RUN_ID], gh);

      expect(code).toBe(0);
      expect(out).toMatch(/^::warning::.*403/m);
      for (const text of [out, err]) {
        expect(text).not.toContain(BODY_MARKER);
        expect(text).not.toContain(TOKEN);
      }
      expect(readFileSync(githubOutput, 'utf8')).toBe(
        'dispatch_status=failed\n'
      );
    });

    it('exits 0 and prints no warning on success', () => {
      const gh = fakeDispatchGh([{ status: 204 }]);

      const { code, out } = runMain(['dispatch', '--run-id', RUN_ID], gh);

      expect(code).toBe(0);
      expect(out).not.toContain('::warning::');
    });

    it.each(['develop', 'release/1.2', 'feature/a-b_c.d', 'v1.0.0', 'a.b/c'])(
      'accepts the valid ref %s',
      (ref) => {
        const gh = fakeDispatchGh([{ status: 204 }]);

        const { code } = runMain(
          ['dispatch', '--run-id', RUN_ID, '--ref', ref],
          gh
        );

        expect(code).toBe(0);
        expect(gh.calls).toHaveLength(1);
      }
    );

    it.each([
      [['dispatch']],
      [['dispatch', '--run-id', '']],
      [['dispatch', '--run-id', '12a']],
      [['dispatch', '--run-id', '1;rm']],
      [['dispatch', '--run-id', '-1']],
      [['dispatch', '--run-id', RUN_ID, '--target-repo', 'nope']],
      [['dispatch', '--run-id', RUN_ID, '--target-repo', 'a/b/c']],
      [['dispatch', '--run-id', RUN_ID, '--workflow', 'x.txt']],
      [['dispatch', '--run-id', RUN_ID, '--workflow', 'a/b.yml']],
      [['dispatch', '--run-id', RUN_ID, '--workflow', '..yml']],
      [['dispatch', '--run-id', RUN_ID, '--workflow', 'a..b.yml']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a b']],
      [['dispatch', '--run-id', RUN_ID, '--ref', '../x']],
      [['dispatch', '--run-id', RUN_ID, '--ref', '--oops']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'release/']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'release//next']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a..b']],
      [['dispatch', '--run-id', RUN_ID, '--ref', '-x']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'x.lock']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'release/x.lock']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'release.lock/x']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'release/.hidden']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'x.']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'release/x.']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a\tb']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a\nb']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a\u0000b']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a\u007fb']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a@{b']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a~b']],
      [['dispatch', '--run-id', RUN_ID, '--ref', 'a:b']],
      [['dispatch', '--run-id', RUN_ID, '--wat', 'x']],
    ])('exits 2 without calling gh for %j', (argv) => {
      const gh = fakeDispatchGh([{ status: 204 }]);

      const { code } = runMain(argv, gh);

      expect(code).toBe(2);
      expect(gh.calls).toHaveLength(0);
      expect(readFileSync(githubOutput, 'utf8')).toBe('');
    });
  });

  it('applies the documented defaults when parsing arguments', () => {
    expect(script.parseArgs(['dispatch', '--run-id', RUN_ID])).toEqual({
      command: 'dispatch',
      runId: RUN_ID,
      targetRepo: TARGET_REPO,
      workflow: WORKFLOW,
      ref: 'develop',
    });
  });
});

describe('report', () => {
  const RUN_URL = `https://github.com/${REPO}/actions/runs/${RUN_ID}`;
  const REPORT_CAP_BYTES = 512 * 1024;
  const DISPATCH_URL =
    'https://github.com/Adyen/adyen-checkout-sdk-meta/actions/runs/777';

  const JOB_ALLOWED = {
    id: 124205245095,
    name: 'Expo (latest, true) / Android Test',
    url: `${RUN_URL}/job/124205245095`,
    conclusion: 'failure',
    blocking: false,
    logFile: 'logs/124205245095.log',
    excerptFile: 'excerpts/124205245095.txt',
  };
  const JOB_BLOCKING = {
    id: 124205419341,
    name: 'React Native (0.79.7) / Android Test',
    url: `${RUN_URL}/job/124205419341`,
    conclusion: 'failure',
    blocking: true,
    logFile: 'logs/124205419341.log',
    excerptFile: 'excerpts/124205419341.txt',
  };

  const STATUS_LINES = {
    'requested': `Droid diagnosis requested in \`Adyen/adyen-checkout-sdk-meta\` (private): [diagnosis run](${DISPATCH_URL})`,
    'not-configured':
      'Diagnosis not requested: `SDK_META_DISPATCH_TOKEN` is not configured.',
    'failed':
      'Diagnosis request to `Adyen/adyen-checkout-sdk-meta` failed; see the job log.',
  };

  let outDir: string;
  let summaryFile: string;

  beforeEach(() => {
    outDir = join(workDir, 'out');
    summaryFile = join(workDir, 'summary.md');
    mkdirSync(outDir, { recursive: true });
  });

  function writeJobs(
    failedJobs: unknown[] = [JOB_ALLOWED, JOB_BLOCKING],
    extra: Record<string, unknown> = {}
  ) {
    writeFileSync(
      join(outDir, 'jobs.json'),
      JSON.stringify({
        schemaVersion: 1,
        repo: REPO,
        runId: RUN_ID,
        runUrl: RUN_URL,
        failedJobs,
        ...extra,
      })
    );
  }

  function runReport(
    options: Record<string, unknown> = {},
    env: Record<string, string> = {}
  ) {
    const result = script.report({ outDir, ...options, env });
    return {
      ...result,
      markdown: readFileSync(result.reportFile, 'utf8') as string,
    };
  }

  const statusLineCount = (markdown: string) =>
    markdown
      .split('\n')
      .filter((line) => /requested|Diagnosis request|not requested/.test(line))
      .length;

  it('renders title, run link and the failed jobs table', () => {
    writeJobs();

    const { markdown, reportFile } = runReport({ dispatch: 'failed' });

    expect(reportFile).toBe(join(outDir, 'report.md'));
    expect(markdown).toContain('## 🤖 E2E failure diagnosis');
    expect(markdown).not.toContain('Droid E2E failure diagnosis');
    expect(markdown).toContain(`[run ${RUN_ID}](${RUN_URL})`);
    expect(markdown).toContain(
      `| [Expo (latest, true) / Android Test](${JOB_ALLOWED.url}) | allowed failure | \`failure\` |`
    );
    expect(markdown).toContain(
      `| [React Native (0.79.7) / Android Test](${JOB_BLOCKING.url}) | blocking | \`failure\` |`
    );
    expect(markdown.endsWith('\n')).toBe(true);
  });

  it.each(['requested', 'not-configured', 'failed'] as const)(
    'renders exactly one status line for --dispatch %s after the table',
    (dispatch) => {
      writeJobs();

      const { markdown } = runReport({
        dispatch,
        dispatchUrl: DISPATCH_URL,
      });

      expect(markdown).toContain(STATUS_LINES[dispatch]);
      expect(statusLineCount(markdown)).toBe(1);
      expect(markdown.indexOf(STATUS_LINES[dispatch])).toBeGreaterThan(
        markdown.indexOf('| Job | Status | Conclusion |')
      );
    }
  );

  it('does not link the requested line when no URL is given', () => {
    writeJobs();

    const { markdown } = runReport({ dispatch: 'requested' });

    expect(markdown).toContain(
      'Droid diagnosis requested in `Adyen/adyen-checkout-sdk-meta` (private)'
    );
    expect(markdown).not.toContain('](undefined)');
  });

  it('ignores a dispatch URL that is not http(s)', () => {
    writeJobs();

    const { markdown } = runReport({
      dispatch: 'requested',
      dispatchUrl: 'ftp://example.com/x',
    });

    expect(markdown).not.toContain('ftp://');
  });

  it('never renders droid.json or other Droid output from the out dir', () => {
    writeJobs();
    writeFileSync(
      join(outDir, 'droid.json'),
      JSON.stringify({ result: 'DROID-RESULT-MARKER', is_error: false })
    );

    const { markdown } = runReport(
      { dispatch: 'requested' },
      {
        DROID_MODEL: 'some-model',
      }
    );

    expect(markdown).not.toContain('DROID-RESULT-MARKER');
    expect(markdown).not.toContain('some-model');
    expect(markdown).not.toMatch(/AI-generated/);
    expect(markdown).not.toMatch(/FACTORY_API/);
  });

  it('renders the collect-failed fallback without a table or status line', () => {
    writeJobs();

    const { markdown } = runReport(
      { reason: 'collect-failed', dispatch: 'requested' },
      { GITHUB_REPOSITORY: REPO, GITHUB_RUN_ID: RUN_ID }
    );

    expect(markdown).toContain('## 🤖 E2E failure diagnosis');
    expect(markdown).toContain(
      `[run ${RUN_ID}](https://github.com/${REPO}/actions/runs/${RUN_ID})`
    );
    expect(markdown).toContain('Could not list the jobs of this run');
    expect(markdown).not.toContain('| Job |');
    expect(statusLineCount(markdown)).toBe(0);
    expect(markdown).not.toMatch(/droid/i);
  });

  it('renders a short note when no E2E job failed', () => {
    writeJobs([]);

    const { markdown } = runReport({ dispatch: 'requested' });

    expect(markdown).toBe(
      `**E2E failure diagnosis:** No failed E2E jobs in this run ([run ${RUN_ID}](${RUN_URL})).\n`
    );
  });

  it('escapes pipes and brackets in job names and drops non-http job URLs', () => {
    writeJobs([
      { ...JOB_BLOCKING, name: 'A | [b]', url: 'ftp://example.com/x' },
    ]);

    const { markdown } = runReport({ dispatch: 'failed' });

    expect(markdown).toContain('| A \\| \\[b\\] | blocking |');
    expect(markdown).not.toContain('ftp://');
  });

  it('writes --report-file and appends the same content to GITHUB_STEP_SUMMARY', () => {
    writeJobs();
    writeFileSync(summaryFile, 'previous content\n');
    const reportFile = join(workDir, 'nested', 'custom.md');

    const { markdown } = runReport(
      { dispatch: 'failed', reportFile },
      { GITHUB_STEP_SUMMARY: summaryFile }
    );

    expect(readFileSync(reportFile, 'utf8')).toBe(markdown);
    expect(readFileSync(summaryFile, 'utf8')).toBe(
      `previous content\n${markdown}`
    );
    expect(existsSync(join(outDir, 'report.md'))).toBe(false);
  });

  it('truncates output above 512 KiB with a visible notice', () => {
    const manyJobs = Array.from({ length: 6000 }, (_, i) => ({
      ...JOB_BLOCKING,
      id: i,
      name: `React Native (${'x'.repeat(100)}-${i}) / Android Test`,
    }));
    writeJobs(manyJobs);

    const { markdown } = runReport({ dispatch: 'failed' });

    expect(Buffer.byteLength(markdown)).toBeLessThanOrEqual(REPORT_CAP_BYTES);
    expect(markdown).toContain('Report truncated');
  });

  it.each([
    ['requested', 'Droid diagnosis requested in'],
    ['not-configured', 'SDK_META_DISPATCH_TOKEN'],
    ['failed', 'failed; see the job log'],
  ])(
    'keeps the %s dispatch status line exactly once when the jobs table is capped',
    (dispatch, statusText) => {
      const manyJobs = Array.from({ length: 6000 }, (_, i) => ({
        ...JOB_BLOCKING,
        id: i,
        name: `React Native (${'x'.repeat(100)}-${i}) / Android Test`,
      }));
      writeJobs(manyJobs);

      const { markdown } = runReport({
        dispatch,
        dispatchUrl: DISPATCH_URL,
      });

      expect(Buffer.byteLength(markdown)).toBeLessThanOrEqual(REPORT_CAP_BYTES);
      expect(markdown).toContain('Report truncated');
      expect(markdown.split(statusText)).toHaveLength(2);
      expect(markdown.trimEnd().split('\n').pop()).toContain(statusText);
    }
  );

  describe('arguments', () => {
    it('parses --dispatch, --dispatch-url and --reason', () => {
      expect(
        script.parseArgs([
          'report',
          '--out-dir',
          '/tmp/o',
          '--dispatch',
          'requested',
          '--dispatch-url',
          DISPATCH_URL,
          '--reason',
          'collect-failed',
          '--report-file',
          '/tmp/r.md',
        ])
      ).toEqual({
        command: 'report',
        outDir: '/tmp/o',
        dispatch: 'requested',
        dispatchUrl: DISPATCH_URL,
        reason: 'collect-failed',
        reportFile: '/tmp/r.md',
      });
    });

    it.each([
      [['report']],
      [['report', '--out-dir', '/tmp/o', '--dispatch', 'maybe']],
      [['report', '--out-dir', '/tmp/o', '--reason', 'something-else']],
      [['report', '--out-dir', '/tmp/o', '--droid-output', '/tmp/d.json']],
    ])('rejects %j with a usage error', (argv) => {
      expect(() => script.parseArgs(argv)).toThrow(script.UsageError);
    });

    it('exits 2 for an unknown --dispatch value through main', () => {
      const code = script.main(
        ['report', '--out-dir', outDir, '--dispatch', 'maybe'],
        { env: {}, stdout: () => undefined, stderr: () => undefined }
      );

      expect(code).toBe(2);
    });
  });
});
