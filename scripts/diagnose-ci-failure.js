#!/usr/bin/env node
// Copyright (c) 2026 Adyen N.V.

const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const { spawnSync } = require('child_process');

const USAGE = `Usage:
  node diagnose-ci-failure.js collect --repo <owner/name> --run-id <id> --out-dir <dir>
  node diagnose-ci-failure.js dispatch --run-id <id> [--target-repo <owner/name>] [--workflow <file.yml>] [--ref <ref>]
  node diagnose-ci-failure.js report --out-dir <dir> [--dispatch requested|not-configured|failed] [--dispatch-url <url>] [--reason collect-failed] [--report-file <path>]

Environment:
  collect: GH_TOKEN with read access to the repository's Actions.
  dispatch: GH_TOKEN with permission to dispatch workflows in the target repository.
  report: optional GITHUB_STEP_SUMMARY (the report is appended to it).`;

const E2E_JOB_PREFIXES = ['React Native (', 'Expo (', 'Android AGP 9 ('];
const FAILED_CONCLUSIONS = ['failure', 'timed_out'];
const ALLOWED_FAILURE_NAME = /, true\)/;
const ALLOWED_FAILURE_MARKER = 'Non-blocking';
// Only the `##[error]` annotation counts: "Non-blocking" can also appear in
// ordinary tool output, which must not turn a blocking job into an allowed one.
const ALLOWED_FAILURE_ERROR_LINE = /^(?:\S+Z )?##\[error\].*Non-blocking/m;
const ALLOWED_FAILURE_GROUP = /^##\[group\]Run .*title=Non-blocking failure/;

const EXCERPT_MAX_BYTES = 40 * 1024;
const TOTAL_EXCERPT_MAX_BYTES = 200 * 1024;
const RAW_LOG_MAX_BYTES = 2 * 1024 * 1024;
const LINES_BEFORE_ERROR = 80;
const LINES_AFTER_ERROR = 10;
const FALLBACK_TAIL_LINES = 150;
const MAX_LINE_CHARS = 2000;
const TRUNCATION_MARKER_RESERVE_BYTES = 64;
const GH_MAX_BUFFER_BYTES = 512 * 1024 * 1024;

const BUNDLE_SCHEMA_VERSION = 1;

const DEFAULT_TARGET_REPO = 'Adyen/adyen-checkout-sdk-meta';
const DEFAULT_WORKFLOW = 'diagnose-react-native-e2e.yml';
const DEFAULT_REF = 'develop';
const REPO_FORMAT = /^[\w.-]+\/[\w.-]+$/;
const WORKFLOW_FORMAT = /^\w[\w.-]*\.ya?ml$/;
const REF_FORMAT = /^\w[\w./-]*$/;
const HTTP_STATUS_LINE = /^HTTP\/\S+ (\d{3})/;
const HTTP_STATUS_IN_MESSAGE = /\(HTTP (\d{3})\)|HTTP\/\S+ (\d{3})/;
const GITHUB_URL = /^https:\/\/github\.com\/\S+$/;

const REPORT_REASONS = ['collect-failed'];
const DISPATCH_STATUSES = ['requested', 'not-configured', 'failed'];
const REPORT_TITLE = '## 🤖 E2E failure diagnosis';
const REPORT_MAX_BYTES = 512 * 1024;
const REPORT_TRUNCATION_NOTICE =
  '> ⚠️ Report truncated: it exceeded the 512 KiB limit.';
const REPORT_NOTICE_RESERVE_BYTES = 256;

const TIMESTAMP_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z ?/;
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\u001b\[[0-9;]*[A-Za-z]/g;
const POST_JOB_START = /^(?:Post job cleanup\.?|##\[group\]Post )/;

class UsageError extends Error {}

const COMMAND_FLAGS = {
  collect: {
    '--repo': 'repo',
    '--run-id': 'runId',
    '--out-dir': 'outDir',
  },
  dispatch: {
    '--run-id': 'runId',
    '--target-repo': 'targetRepo',
    '--workflow': 'workflow',
    '--ref': 'ref',
  },
  report: {
    '--out-dir': 'outDir',
    '--dispatch': 'dispatch',
    '--dispatch-url': 'dispatchUrl',
    '--reason': 'reason',
    '--report-file': 'reportFile',
  },
};

function validateDispatchOptions(options) {
  if (!options.runId) throw new UsageError('Missing --run-id');
  if (!/^\d+$/.test(options.runId)) {
    throw new UsageError(`Invalid --run-id: ${options.runId}`);
  }
  const targetRepo = options.targetRepo || DEFAULT_TARGET_REPO;
  const workflow = options.workflow || DEFAULT_WORKFLOW;
  const ref = options.ref || DEFAULT_REF;
  if (!REPO_FORMAT.test(targetRepo)) {
    throw new UsageError(`Invalid --target-repo: ${targetRepo}`);
  }
  if (!WORKFLOW_FORMAT.test(workflow) || workflow.includes('..')) {
    throw new UsageError(`Invalid --workflow: ${workflow}`);
  }
  if (!REF_FORMAT.test(ref) || ref.includes('..')) {
    throw new UsageError(`Invalid --ref: ${ref}`);
  }
  return {
    command: 'dispatch',
    runId: options.runId,
    targetRepo,
    workflow,
    ref,
  };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flagOptions = COMMAND_FLAGS[command];
  if (!flagOptions) {
    throw new UsageError(
      command ? `Unknown command: ${command}` : 'Missing command'
    );
  }

  const options = { command };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    const equals = token.indexOf('=');
    const flag = equals === -1 ? token : token.slice(0, equals);
    const key = flagOptions[flag];
    if (!key) throw new UsageError(`Unknown argument: ${token}`);

    let value;
    if (equals !== -1) {
      value = token.slice(equals + 1);
    } else {
      i += 1;
      value = rest[i];
    }
    if (!value) throw new UsageError(`Missing value for ${flag}`);
    options[key] = value;
  }

  if (command === 'dispatch') return validateDispatchOptions(options);

  if (!options.outDir) throw new UsageError('Missing --out-dir');
  if (command === 'report') {
    if (options.reason && !REPORT_REASONS.includes(options.reason)) {
      throw new UsageError(`Invalid --reason: ${options.reason}`);
    }
    if (options.dispatch && !DISPATCH_STATUSES.includes(options.dispatch)) {
      throw new UsageError(`Invalid --dispatch: ${options.dispatch}`);
    }
    return options;
  }

  if (!options.repo) throw new UsageError('Missing --repo');
  if (!options.runId) throw new UsageError('Missing --run-id');
  if (!REPO_FORMAT.test(options.repo)) {
    throw new UsageError(`Invalid --repo: ${options.repo}`);
  }
  if (!/^\d+$/.test(options.runId)) {
    throw new UsageError(`Invalid --run-id: ${options.runId}`);
  }
  return options;
}

// `options.input` is written to gh's stdin. A failed call throws an error that
// carries gh's stdout (`-i` puts the HTTP status line there) so callers can
// read the status without printing the response.
function defaultRunGh(args, env = process.env, options = {}) {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: GH_MAX_BUFFER_BYTES,
    env,
    input: options.input,
  });
  if (result.error)
    throw new Error(`gh could not run: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = (result.stderr || '').trim() || `exit code ${result.status}`;
    const error = new Error(`gh ${args.join(' ')} failed: ${detail}`);
    error.stdout = result.stdout;
    throw error;
  }
  return result.stdout;
}

// `gh api --paginate` prints one JSON document per page, back to back, unless
// `--slurp` wraps them in an array. Accept both.
function splitJsonDocuments(text) {
  const documents = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) documents.push(JSON.parse(text.slice(start, i + 1)));
    }
  }
  return documents;
}

function parseJobPages(output) {
  const pages = splitJsonDocuments(output).flatMap((document) =>
    Array.isArray(document) ? document : [document]
  );
  return pages.flatMap((page) =>
    Array.isArray(page.jobs) ? page.jobs : [page]
  );
}

function listJobs(repo, runId, runGh) {
  const output = runGh([
    'api',
    `repos/${repo}/actions/runs/${runId}/jobs?per_page=100`,
    '--paginate',
  ]);
  return parseJobPages(output);
}

function selectFailedJobs(jobs) {
  return jobs.filter(
    (job) =>
      FAILED_CONCLUSIONS.includes(job.conclusion) &&
      E2E_JOB_PREFIXES.some((prefix) => job.name.startsWith(prefix))
  );
}

function isAllowedFailure(jobName, log) {
  if (log && ALLOWED_FAILURE_ERROR_LINE.test(log)) return true;
  return ALLOWED_FAILURE_NAME.test(jobName);
}

function cleanLine(line, isFirst) {
  let cleaned = isFirst ? line.replace(/^\uFEFF/, '') : line;
  cleaned = cleaned.replace(TIMESTAMP_PREFIX, '').replace(ANSI_ESCAPE, '');
  if (cleaned.length > MAX_LINE_CHARS) {
    cleaned = `${cleaned.slice(0, MAX_LINE_CHARS)} [... line truncated ...]`;
  }
  return cleaned;
}

function isMarkerError(line) {
  return line.startsWith('##[error]') && line.includes(ALLOWED_FAILURE_MARKER);
}

// The allowed-failure step and everything after it (post-job cleanup, summaries)
// is noise, not evidence.
function findContentEnd(lines) {
  const candidates = [lines.length];
  const postJob = lines.findIndex((line) => POST_JOB_START.test(line));
  if (postJob !== -1) candidates.push(postJob);
  const marker = lines.findIndex((line) => ALLOWED_FAILURE_GROUP.test(line));
  if (marker !== -1) candidates.push(marker);
  return Math.min(...candidates);
}

function mergeWindows(windows) {
  const merged = [];
  for (const window of windows) {
    const last = merged[merged.length - 1];
    if (last && window.start <= last.end + 1) {
      last.end = Math.max(last.end, window.end);
      last.anchors.push(...window.anchors);
    } else {
      merged.push({ ...window, anchors: [...window.anchors] });
    }
  }
  return merged;
}

function findErrorWindows(content) {
  const errorIndexes = [];
  content.forEach((line, index) => {
    if (line.startsWith('##[error]') && !isMarkerError(line)) {
      errorIndexes.push(index);
    }
  });

  return mergeWindows(
    errorIndexes.map((index) => ({
      start: Math.max(0, index - LINES_BEFORE_ERROR),
      end: Math.min(content.length - 1, index + LINES_AFTER_ERROR),
      anchors: [index],
    }))
  );
}

// Lower rank is kept first. The first anchor of every window ranks -1 so each
// window is considered before anything else; other anchors rank 0; context
// ranks by distance to the nearest anchor, preceding context before following
// context.
function rankWindowLines(content, window) {
  const size = window.end - window.start + 1;
  const isAnchor = new Array(size).fill(false);
  for (const anchor of window.anchors) isAnchor[anchor - window.start] = true;

  const sincePrevious = new Array(size);
  let previous = -Infinity;
  for (let i = 0; i < size; i += 1) {
    if (isAnchor[i]) previous = i;
    sincePrevious[i] = i - previous;
  }
  const untilNext = new Array(size);
  let next = Infinity;
  for (let i = size - 1; i >= 0; i -= 1) {
    if (isAnchor[i]) next = i;
    untilNext[i] = next - i;
  }

  return content.slice(window.start, window.end + 1).map((line, i) => {
    let rank;
    if (isAnchor[i]) {
      rank = window.start + i === window.anchors[0] ? -1 : 0;
    } else if (untilNext[i] <= sincePrevious[i]) {
      rank = 2 * untilNext[i] - 1;
    } else {
      rank = 2 * sincePrevious[i];
    }
    return { index: window.start + i, cost: Buffer.byteLength(line) + 1, rank };
  });
}

function selectLinesWithinBudget(candidates, budget) {
  const selected = new Set();
  let used = 0;
  for (const candidate of candidates) {
    if (used + candidate.cost <= budget) {
      selected.add(candidate.index);
      used += candidate.cost;
    }
    // A line that does not fit is skipped, not a stop: candidates are ranked
    // across all windows, so a long line of one window must not starve the
    // shorter, equally close context of another.
  }
  return selected;
}

function countOmittedAnchors(windows, selected) {
  return windows
    .flatMap((window) => window.anchors)
    .filter((anchor) => !selected.has(anchor)).length;
}

function renderWindows(content, windows, selected, logPath) {
  const output = [];
  let previousEnd = null;
  windows.forEach((window) => {
    let hasSelected = false;
    for (let i = window.start; i <= window.end && !hasSelected; i += 1) {
      hasSelected = selected.has(i);
    }
    if (!hasSelected) return;

    if (previousEnd !== null) {
      output.push(`[... ${window.start - previousEnd - 1} lines omitted ...]`);
    }
    previousEnd = window.end;
    let skipped = 0;
    for (let i = window.start; i <= window.end; i += 1) {
      if (selected.has(i)) {
        if (skipped > 0) output.push(`[... truncated ${skipped} lines ...]`);
        skipped = 0;
        output.push(content[i]);
      } else {
        skipped += 1;
      }
    }
    if (skipped > 0) output.push(`[... truncated ${skipped} lines ...]`);
  });

  const omitted = countOmittedAnchors(windows, selected);
  if (omitted > 0) {
    output.push(
      `[... ${omitted} more error lines omitted; see full log ${logPath} ...]`
    );
  }
  return output.join('\n');
}

// Budget is spent on error anchors and their closest context first; when even
// the anchors do not fit, the later ones are dropped and counted in a marker.
function fitWindowsToBudget(content, windows, maxBytes, logPath) {
  const candidates = windows
    .flatMap((window) => rankWindowLines(content, window))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  let budget = maxBytes;
  for (;;) {
    const excerpt = renderWindows(
      content,
      windows,
      selectLinesWithinBudget(candidates, budget),
      logPath
    );
    const overflow = Buffer.byteLength(excerpt) - maxBytes;
    // Markers are not part of the line budget; shrink it by what they cost.
    if (overflow <= 0 || budget <= 0) return excerpt;
    budget -= overflow;
  }
}

function truncateFromStart(lines, maxBytes) {
  const budget = maxBytes - TRUNCATION_MARKER_RESERVE_BYTES;
  let used = 0;
  let keepFrom = lines.length;
  while (keepFrom > 0) {
    const cost = Buffer.byteLength(lines[keepFrom - 1]) + 1;
    if (used + cost > budget) break;
    used += cost;
    keepFrom -= 1;
  }
  return [`[... truncated ${keepFrom} lines ...]`, ...lines.slice(keepFrom)];
}

function extractExcerpt(
  rawLog,
  { maxBytes = EXCERPT_MAX_BYTES, logPath = 'the job log' } = {}
) {
  const lines = rawLog
    .split(/\r?\n/)
    .map((line, index) => cleanLine(line, index === 0));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

  const content = lines.slice(0, findContentEnd(lines));
  const windows = findErrorWindows(content);
  if (windows.length > 0) {
    return fitWindowsToBudget(content, windows, maxBytes, logPath);
  }

  const tail = content
    .filter((line) => line.trim() !== '')
    .slice(-FALLBACK_TAIL_LINES);
  const excerpt = tail.join('\n');
  if (Buffer.byteLength(excerpt) <= maxBytes) return excerpt;
  return truncateFromStart(tail, maxBytes).join('\n');
}

function capRawLog(log, maxBytes = RAW_LOG_MAX_BYTES) {
  const buffer = Buffer.from(log);
  if (buffer.length <= maxBytes) return log;

  const start = buffer.length - (maxBytes - TRUNCATION_MARKER_RESERVE_BYTES);
  const newline = buffer.indexOf(0x0a, start);
  const cut = newline === -1 ? buffer.length : newline + 1;
  return `[... truncated ${cut} bytes ...]\n${buffer.subarray(cut).toString('utf8')}`;
}

function statusLabel(job) {
  return job.blocking ? 'blocking' : 'allowed failure';
}

function appendGithubOutput(env, values) {
  if (!env.GITHUB_OUTPUT) return;
  const text = Object.entries(values)
    .map(([key, value]) => `${key}=${value}\n`)
    .join('');
  fs.appendFileSync(env.GITHUB_OUTPUT, text);
}

function collect(options, runGh = defaultRunGh) {
  const { repo, runId, env = process.env } = options;
  const outDir = path.resolve(options.outDir);
  const runUrl = `${env.GITHUB_SERVER_URL || 'https://github.com'}/${repo}/actions/runs/${runId}`;
  const logsDir = path.join(outDir, 'logs');
  const excerptsDir = path.join(outDir, 'excerpts');

  const failed = selectFailedJobs(listJobs(repo, runId, runGh));

  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(excerptsDir, { recursive: true });

  const excerptBudget = Math.min(
    EXCERPT_MAX_BYTES,
    Math.floor(TOTAL_EXCERPT_MAX_BYTES / Math.max(failed.length, 1))
  );

  const failedJobs = failed.map((job) => {
    const entry = {
      id: job.id,
      name: job.name,
      url: job.html_url,
      conclusion: job.conclusion,
    };

    let log;
    try {
      log = runGh(['api', `repos/${repo}/actions/jobs/${job.id}/logs`]);
    } catch (error) {
      return {
        ...entry,
        blocking: !isAllowedFailure(job.name, undefined),
        logFile: null,
        excerptFile: null,
        logError: error.message,
      };
    }

    const logFile = `logs/${job.id}.log`;
    const excerptFile = `excerpts/${job.id}.txt`;
    fs.writeFileSync(path.join(outDir, logFile), capRawLog(log));
    fs.writeFileSync(
      path.join(outDir, excerptFile),
      extractExcerpt(log, { maxBytes: excerptBudget, logPath: logFile })
    );
    return {
      ...entry,
      blocking: !isAllowedFailure(job.name, log),
      logFile,
      excerptFile,
    };
  });

  fs.writeFileSync(
    path.join(outDir, 'jobs.json'),
    `${JSON.stringify(
      { schemaVersion: BUNDLE_SCHEMA_VERSION, repo, runId, runUrl, failedJobs },
      null,
      2
    )}\n`
  );

  appendGithubOutput(env, {
    has_failures: String(failedJobs.length > 0),
    failed_count: failedJobs.length,
  });

  return { runUrl, failedJobs, outDir };
}

function readJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readJobsFile(outDir) {
  const jobs = readJsonFile(path.join(outDir, 'jobs.json'));
  if (!jobs || typeof jobs !== 'object' || !Array.isArray(jobs.failedJobs)) {
    return null;
  }
  return jobs;
}

function escapeTableText(text) {
  return String(text).replace(/[|[\]]/g, (char) => `\\${char}`);
}

function runLink(runUrl, runId) {
  if (!runUrl) return null;
  return `[${runId ? `run ${runId}` : 'this run'}](${runUrl})`;
}

function jobsTable(failedJobs) {
  const rows = failedJobs.map((job) => {
    const name = escapeTableText(job.name);
    const label = /^https?:\/\//.test(job.url || '')
      ? `[${name}](${job.url})`
      : name;
    return `| ${label} | ${statusLabel(job)} | \`${job.conclusion}\` |`;
  });
  return ['| Job | Status | Conclusion |', '| --- | --- | --- |', ...rows].join(
    '\n'
  );
}

function truncateReport(markdown) {
  if (Buffer.byteLength(markdown) <= REPORT_MAX_BYTES) return markdown;

  const buffer = Buffer.from(markdown, 'utf8');
  let cut = REPORT_MAX_BYTES - REPORT_NOTICE_RESERVE_BYTES;
  // Step back over UTF-8 continuation bytes so no character is split.
  while (cut > 0 && buffer[cut] >= 0x80 && buffer[cut] < 0xc0) cut -= 1;

  const kept = buffer.subarray(0, cut).toString('utf8').trimEnd();
  return `${kept}\n\n${REPORT_TRUNCATION_NOTICE}\n`;
}

function dispatchStatusLine(status, dispatchUrl) {
  if (status === 'requested') {
    const target = `Droid diagnosis requested in \`${DEFAULT_TARGET_REPO}\` (private)`;
    return /^https?:\/\/\S+$/.test(dispatchUrl || '')
      ? `${target}: [diagnosis run](${dispatchUrl})`
      : `${target}.`;
  }
  if (status === 'not-configured') {
    return 'Diagnosis not requested: `SDK_META_DISPATCH_TOKEN` is not configured.';
  }
  if (status === 'failed') {
    return `Diagnosis request to \`${DEFAULT_TARGET_REPO}\` failed; see the job log.`;
  }
  return null;
}

function renderReport({ outDir, dispatchStatus, dispatchUrl, reason, env }) {
  const jobs = reason === 'collect-failed' ? null : readJobsFile(outDir);
  const failedJobs = jobs ? jobs.failedJobs : [];
  const runUrl =
    (jobs && jobs.runUrl) ||
    (env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
      ? `${env.GITHUB_SERVER_URL || 'https://github.com'}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
      : null);
  const link = runLink(runUrl, jobs ? jobs.runId : env.GITHUB_RUN_ID);

  if (jobs && failedJobs.length === 0) {
    return `**E2E failure diagnosis:** No failed E2E jobs in this run${link ? ` (${link})` : ''}.\n`;
  }

  const sections = [REPORT_TITLE];
  if (link) sections.push(`Run: ${link}`);

  if (!jobs) {
    sections.push(
      '⚠️ Could not list the jobs of this run, so no diagnosis was attempted.'
    );
  } else {
    sections.push(jobsTable(failedJobs));
    const statusLine = dispatchStatusLine(dispatchStatus, dispatchUrl);
    if (statusLine) sections.push(statusLine);
  }

  return truncateReport(`${sections.join('\n\n')}\n`);
}

function report(options) {
  const { env = process.env, reason, dispatchUrl } = options;
  const outDir = path.resolve(options.outDir);
  const reportFile = path.resolve(
    options.reportFile || path.join(outDir, 'report.md')
  );
  const markdown = renderReport({
    outDir,
    dispatchStatus: options.dispatch,
    dispatchUrl,
    reason,
    env,
  });

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, markdown);
  if (env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(env.GITHUB_STEP_SUMMARY, markdown);

  return { reportFile, markdown };
}

function parseHttpResponse(output) {
  const text = String(output || '');
  const statusLine = text.match(HTTP_STATUS_LINE);
  const bodyStart = text.search(/\r?\n\r?\n/);
  return {
    status: statusLine ? Number(statusLine[1]) : null,
    body: bodyStart === -1 ? '' : text.slice(bodyStart).trim(),
  };
}

// Response bodies and error messages can echo request data, so only the
// numeric status is ever taken from a failed call.
function failureStatus(error) {
  const fromOutput = parseHttpResponse(error.stdout).status;
  if (fromOutput) return fromOutput;
  const fromMessage = String(error.message).match(HTTP_STATUS_IN_MESSAGE);
  return fromMessage ? Number(fromMessage[1] || fromMessage[2]) : null;
}

function postDispatch({ targetRepo, workflow }, payload, runGh) {
  const endpoint = `repos/${targetRepo}/actions/workflows/${workflow}/dispatches`;
  try {
    const response = parseHttpResponse(
      runGh(['api', '-i', '-X', 'POST', endpoint, '--input', '-'], {
        input: JSON.stringify(payload),
      })
    );
    const failedStatus =
      response.status && Math.floor(response.status / 100) !== 2;
    return failedStatus
      ? { ok: false, status: response.status }
      : { ok: true, body: response.body };
  } catch (error) {
    return { ok: false, status: failureStatus(error) };
  }
}

function dispatchedRunUrl(body) {
  try {
    const { html_url: htmlUrl } = JSON.parse(body);
    return typeof htmlUrl === 'string' && GITHUB_URL.test(htmlUrl)
      ? htmlUrl
      : null;
  } catch {
    return null;
  }
}

// HTTP 204 already means the workflow was dispatched, so only a 422 (the API
// rejecting `return_run_details`) triggers the single retry without it.
function dispatch(options, runGh = defaultRunGh) {
  const { runId, targetRepo, workflow, ref, env = process.env } = options;
  const target = { targetRepo, workflow };
  const workflowPage = `https://github.com/${targetRepo}/actions/workflows/${workflow}`;
  const payload = { ref, inputs: { run_id: runId } };

  let response = postDispatch(
    target,
    { ...payload, return_run_details: true },
    runGh
  );
  if (!response.ok && response.status === 422) {
    response = postDispatch(target, payload, runGh);
  }

  if (!response.ok) {
    appendGithubOutput(env, { dispatch_status: 'failed' });
    const detail = response.status
      ? `HTTP ${response.status}`
      : 'no HTTP status';
    return {
      status: 'failed',
      url: null,
      warning: `::warning::Diagnosis dispatch to ${targetRepo} failed (${detail}).`,
    };
  }

  const url = dispatchedRunUrl(response.body) || workflowPage;
  appendGithubOutput(env, { dispatch_status: 'requested', dispatch_url: url });
  return { status: 'requested', url, warning: null };
}

function main(argv = process.argv.slice(2), deps = {}) {
  const env = deps.env || process.env;
  const runGh =
    deps.runGh || ((args, runOptions) => defaultRunGh(args, env, runOptions));
  const stdout =
    deps.stdout || ((message) => process.stdout.write(`${message}\n`));
  const stderr =
    deps.stderr || ((message) => process.stderr.write(`${message}\n`));

  try {
    const options = parseArgs(argv);
    if (options.command === 'report') {
      const { reportFile } = report({ ...options, env });
      stdout(`Wrote report to ${reportFile}`);
      return 0;
    }
    if (options.command === 'dispatch') {
      const result = dispatch({ ...options, env }, runGh);
      if (result.warning) stdout(result.warning);
      stdout(`Diagnosis dispatch: ${result.status}`);
      return 0;
    }
    const { failedJobs } = collect({ ...options, env }, runGh);
    stdout(`Found ${failedJobs.length} failed E2E job(s).`);
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      stderr(`${error.message}\n\n${USAGE}`);
      return 2;
    }
    stderr(`Error: ${error.message}`);
    return 1;
  }
}

module.exports = {
  EXCERPT_MAX_BYTES,
  TOTAL_EXCERPT_MAX_BYTES,
  RAW_LOG_MAX_BYTES,
  REPORT_MAX_BYTES,
  UsageError,
  capRawLog,
  collect,
  dispatch,
  extractExcerpt,
  isAllowedFailure,
  listJobs,
  main,
  parseArgs,
  parseJobPages,
  report,
  selectFailedJobs,
};

if (require.main === module) {
  process.exitCode = main();
}
