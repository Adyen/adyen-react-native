# Diagnose E2E Failure

A composite action that diagnoses failed end-to-end (E2E) jobs with [Droid](https://factory.ai), Factory's AI agent. It collects the logs of the failed jobs, asks a read-only Droid agent for a root cause and a suggested patch, and publishes the result as a job summary and an artifact.

The diagnosis is AI-generated. Verify it before acting on it.

## When it runs

The `diagnose-e2e-failure` job (**Diagnose E2E failure**) in [`pr_check.yml`](../../workflows/pr_check.yml) uses this action. It runs after the `React Native`, `Expo` and `Android AGP 9` job groups when all of these are true:

- The pull request has the `run-e2e-tests` label.
- The pull request comes from a branch of this repository. Pull requests from forks are skipped.

The job runs even when the E2E jobs fail. It diagnoses every E2E job with conclusion `failure` or `timed_out`, including allowed-failure (`continue-on-error`) matrix entries such as the `latest` versions. The report marks each job as `blocking` or `allowed failure`. When no E2E job failed, Droid is not run and no artifact is uploaded.

The job has `continue-on-error: true` and every step tolerates errors, so the diagnosis never fails the PR check.

## Setup

Add a repository secret named `FACTORY_API_KEY` that contains a Factory API key. Use a service-account key rather than a personal key.

Without the secret, Droid is neither installed nor run, and the report says `FACTORY_API_KEY is not configured; diagnosis skipped.` together with the table of failed jobs.

## Inputs

| Input             | Required | Default                 | Description                                                                                       |
| ----------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `factory-api-key` | No       | `''`                    | Factory API key used by Droid. When empty, Droid is skipped and the report says so.               |
| `github-token`    | Yes      |                         | Token with read access to Actions (jobs, logs, artifacts). It is never passed to Droid.          |
| `model`           | No       | `claude-sonnet-5-5`     | Model used by Droid.                                                                              |
| `run-id`          | No       | `${{ github.run_id }}`  | Workflow run to diagnose.                                                                         |
| `droid-version`   | No       | `1.1.0`                 | Droid CLI version. Passed to `setup-droid`. Only the default version has a checksum pinned.       |

The calling job needs `contents: read` and `actions: read` permissions, a checkout of the repository and Node.js (the action runs [`scripts/diagnose-ci-failure.js`](../../../scripts/diagnose-ci-failure.js)).

## Outputs

| Output         | Description                                  |
| -------------- | -------------------------------------------- |
| `report-path`  | Path of the generated `report.md`.           |
| `has-failures` | `true` when failed E2E jobs were found.      |

## How it works

1. **Collect.** `diagnose-ci-failure.js collect` lists the jobs of the run through the GitHub API and selects failed jobs whose names start with `React Native (`, `Expo (` or `Android AGP 9 (`. For each job it saves the raw log (capped at 2 MB) and an excerpt around the `##[error]` lines (at most 40 KB per job and 200 KB in total). It then writes the Droid prompt.
2. **Download evidence.** The action downloads these artifacts of the run, if they exist:
   - `xcodebuild_log_*`
   - `appium_failure_*` (screenshots)
   - `appium_page_source_*`
   - `android_logs_*`: build and test output of `build-android.sh`, the Appium server log and, on failure, an `adb logcat -d` dump. They are written by [`e2e-tests/scripts/capture-android-logs.sh`](../../../e2e-tests/scripts/capture-android-logs.sh) and uploaded by the `Upload Android Logs` step of [`e2e_test.yml`](../../workflows/e2e_test.yml).
3. **Install Droid.** The installation is delegated to the [`setup-droid`](../setup-droid/README.md) action. It downloads the pinned Droid version from `downloads.factory.ai` and checks its SHA-256 checksum against values hard-coded in its `action.yml`. On x64 runners without AVX2 the baseline build is used. A non-default `droid-version` is checked against the published checksum instead, with a warning. Auto-update is disabled. If the installation fails, Droid is not run and the report explains why.
4. **Run Droid.** `droid exec` reads the prompt, inspects the logs, excerpts, artifacts and the repository checkout, and replies with the sections **Classification** (`code`, `test`, `infra`, `flaky` or `unknown`), **Root cause**, **Evidence** and **Suggested patch**. The run is stopped after 12 minutes.
5. **Report.** `diagnose-ci-failure.js report` renders the report. If the job list could not be fetched, Droid could not be installed, failed, timed out or returned invalid output, the report explains why and lists the failed jobs and their excerpts.

## Where to find the results

- **Job summary** of the **Diagnose E2E failure** job on the workflow run page.
- **Artifact** `e2e-failure-diagnosis`, which contains `report.md`. It is kept for 1 day.

The report contains a link to the run, a table of failed jobs, Droid's answer as returned, and a footer with the model, turns and duration. It is capped at 512 KiB.

## Security model

- Droid can only use the `Read`, `Grep`, `Glob` and `LS` tools. It cannot edit files, run commands or access the network through tools.
- All GitHub API calls are made by the script before Droid starts. `GH_TOKEN` and `GITHUB_TOKEN` are removed from Droid's environment, and the checkout uses `persist-credentials: false`.
- The prompt tells Droid that logs, excerpts and artifacts are untrusted data that may be influenced by pull request content, and that it must not follow instructions found in them.
- Pull requests from forks are skipped, so the secret is only used for branches of this repository.
- Only small evidence artifacts are downloaded. Fixture and build artifacts are not.

## Running the script locally

Collect the failed E2E jobs of a run. This requires the [GitHub CLI](https://cli.github.com) and a `GH_TOKEN` with read access to the repository's Actions:

```bash
GH_TOKEN=<token> node scripts/diagnose-ci-failure.js collect \
  --repo Adyen/adyen-react-native \
  --run-id <run-id> \
  --out-dir /tmp/e2e-diagnosis \
  [--artifacts-dir <dir>]
```

This writes `jobs.json`, `logs/<job-id>.log`, `excerpts/<job-id>.txt` and, when jobs failed, `prompt.md` to the output directory. The artifacts directory defaults to `<out-dir>/artifacts`.

Render the report from the collected data and, optionally, Droid's JSON output (`droid exec -o json`):

```bash
node scripts/diagnose-ci-failure.js report \
  --out-dir /tmp/e2e-diagnosis \
  [--droid-output /tmp/e2e-diagnosis/droid.json] \
  [--reason missing-key|droid-failed|collect-failed] \
  [--report-file <path>]
```

The report is written to `<out-dir>/report.md` by default. Set `DROID_MODEL` to show the model in the footer.

Run the tests:

```bash
yarn jest scripts/__tests__/diagnose-ci-failure
```

## Limitations and next steps

- Droid only suggests a patch. It does not apply it, commit or comment on the pull request.
- Posting the report to Slack is planned for a later phase. The `e2e-failure-diagnosis` artifact and `report.md` are the hand-off point for it.
