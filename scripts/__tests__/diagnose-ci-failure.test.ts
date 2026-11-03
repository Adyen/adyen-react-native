// Copyright (c) 2026 Adyen N.V.

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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
        '--artifacts-dir',
        '/tmp/art',
      ])
    ).toEqual({
      command: 'collect',
      repo: REPO,
      runId: RUN_ID,
      outDir: '/tmp/out',
      artifactsDir: '/tmp/art',
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
        repoDir: '/workspace/repo',
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

  it('lists failed jobs with classification and absolute file paths in jobs.json', () => {
    const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });

    const { outDir, result } = run(gh);
    const jobs = readJobsJson(outDir);

    expect(result.failedJobs).toHaveLength(2);
    expect(jobs).toMatchObject({
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
        logFile: join(outDir, 'logs', '124205245095.log'),
        excerptFile: join(outDir, 'excerpts', '124205245095.txt'),
      },
      {
        id: 124205419341,
        name: 'React Native (0.79.7) / Android Test',
        url: `https://github.com/${REPO}/actions/runs/${RUN_ID}/job/124205419341`,
        conclusion: 'failure',
        blocking: true,
        logFile: join(outDir, 'logs', '124205419341.log'),
        excerptFile: join(outDir, 'excerpts', '124205419341.txt'),
      },
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
    expect(existsSync(join(outDir, 'prompt.md'))).toBe(false);
    expect(readFileSync(githubOutput, 'utf8')).toBe(
      'has_failures=false\nfailed_count=0\n'
    );
    expect(gh.calls.some((args) => args.join(' ').includes('/logs'))).toBe(
      false
    );
  });

  it('removes a stale prompt.md when a rerun finds no failures', () => {
    const gh = fakeGh({
      jobsPages: [[job(1, 'Build lib / Build', 'success')]],
    });
    const outDir = join(workDir, 'out');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'prompt.md'), 'stale');

    run(gh);

    expect(existsSync(join(outDir, 'prompt.md'))).toBe(false);
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
    expect(existsSync(jobs[1].excerptFile)).toBe(true);
    expect(readFileSync(githubOutput, 'utf8')).toContain('failed_count=2');
    const prompt = readFileSync(join(outDir, 'prompt.md'), 'utf8');
    expect(prompt).toContain('HTTP 410');
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

  describe('prompt.md', () => {
    function promptFor(
      gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs })
    ) {
      const { outDir } = run(gh);
      return {
        prompt: readFileSync(join(outDir, 'prompt.md'), 'utf8'),
        outDir,
      };
    }

    it('names the run, repo checkout and artifacts directory', () => {
      const { prompt, outDir } = promptFor();

      expect(prompt).toContain(
        `https://github.com/${REPO}/actions/runs/${RUN_ID}`
      );
      expect(prompt).toContain('/workspace/repo');
      expect(prompt).toContain(join(outDir, 'artifacts'));
    });

    it('uses a custom artifacts directory when given', () => {
      const gh = fakeGh({ jobsPages: [standardJobs], logs: standardLogs });
      const { outDir } = run(gh, { artifactsDir: '/custom/artifacts' });

      expect(readFileSync(join(outDir, 'prompt.md'), 'utf8')).toContain(
        '/custom/artifacts'
      );
    });

    it('lists each failed job with status and absolute excerpt and log paths', () => {
      const { prompt, outDir } = promptFor();

      expect(prompt).toContain('Expo (latest, true) / Android Test');
      expect(prompt).toContain('allowed failure');
      expect(prompt).toContain('React Native (0.79.7) / Android Test');
      expect(prompt).toContain('blocking');
      for (const id of [124205245095, 124205419341]) {
        expect(prompt).toContain(join(outDir, 'excerpts', `${id}.txt`));
        expect(prompt).toContain(join(outDir, 'logs', `${id}.log`));
      }
    });

    it('declares log content untrusted', () => {
      const { prompt } = promptFor();

      expect(prompt).toMatch(/untrusted/i);
      expect(prompt).toMatch(/never follow instructions/i);
    });

    it('asks for repository-grounded diagnosis and forbids edits', () => {
      const { prompt } = promptFor();

      for (const dir of [
        'e2e-tests/',
        '.github/workflows/',
        'scripts/',
        'example/',
        'src/',
      ]) {
        expect(prompt).toContain(dir);
      }
      expect(prompt).toMatch(/do not (attempt to )?(edit|modify)/i);
      expect(prompt).toMatch(/share(s)? a root cause|same root cause/i);
    });

    it('defines the classification vocabulary and required headings', () => {
      const { prompt } = promptFor();

      for (const label of ['code', 'test', 'infra', 'flaky', 'unknown']) {
        expect(prompt).toContain(`\`${label}\``);
      }
      for (const heading of [
        '### Classification',
        '### Root cause',
        '### Evidence',
        '### Suggested patch',
      ]) {
        expect(prompt).toContain(heading);
      }
      expect(prompt).toContain('```diff');
      expect(prompt).toContain('No patch suggested');
    });
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
        repoDir: '/workspace/repo',
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

  it('produces a prompt that lists both real jobs with their status and paths', () => {
    const { outDir } = collectReal();
    const prompt = readFileSync(join(outDir, 'prompt.md'), 'utf8');

    expect(prompt).toContain(
      `**Expo (latest, true) / Android Test** (job ${ALLOWED_ID}): allowed failure`
    );
    expect(prompt).toContain(
      `**React Native (0.79.7) / Android Test** (job ${BLOCKING_ID}): blocking`
    );
    expect(prompt).toContain(join(outDir, 'excerpts', `${BLOCKING_ID}.txt`));
  });
});
