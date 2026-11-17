# Diagnose E2E Failure

A composite action that collects the data of failed end-to-end (E2E) jobs and hands it to a private repository, which runs the AI diagnosis. This repository holds no AI credentials and runs no AI agent. It only collects data, uploads it as an artifact and triggers a workflow in `Adyen/adyen-checkout-sdk-meta` (private).

## When it runs

The `diagnose-e2e-failure` job (**Diagnose E2E failure**) in [`pr_check.yml`](../../workflows/pr_check.yml) uses this action. It runs after the `React Native`, `Expo` and `Android AGP 9` job groups when all of these are true:

- The pull request has the `run-e2e-tests` label.
- The pull request comes from a branch of this repository. Pull requests from forks are skipped.

The job runs even when the E2E jobs fail. It collects every E2E job with conclusion `failure` or `timed_out`, including allowed-failure (`continue-on-error`) matrix entries such as the `latest` versions. The report marks each job as `blocking` or `allowed failure`. When no E2E job failed, nothing is uploaded or dispatched.

The job has `continue-on-error: true` and every step tolerates errors, so the diagnosis never fails the PR check.

## Setup

Add a repository secret named `SDK_META_DISPATCH_TOKEN`. It is a fine-grained personal access token with:

- **Resource owner:** `Adyen`.
- **Repository access:** only `Adyen/adyen-checkout-sdk-meta`.
- **Repository permissions:** `Actions: write` (and the implicit read-only `Metadata`).

The token is used only to dispatch the `diagnose-react-native-e2e.yml` workflow on the `develop` branch of the meta repository. The Factory API key lives in the meta repository only, in its `droid-diagnosis` environment.

Without the secret, the action still collects data, uploads `e2e-diagnosis-data` and writes the summary. Only the dispatch is skipped, and the summary says `Diagnosis not requested: SDK_META_DISPATCH_TOKEN is not configured.`

## Inputs

| Input            | Required | Default                | Description                                                                                       |
| ---------------- | -------- | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `github-token`   | Yes      |                        | Token with read access to Actions (jobs, logs, artifacts) of this repository.                     |
| `dispatch-token` | No       | `''`                   | `SDK_META_DISPATCH_TOKEN`. When empty, the diagnosis is not requested and the report says so.     |
| `run-id`         | No       | `${{ github.run_id }}` | Workflow run to diagnose.                                                                         |

The calling job needs `contents: read` and `actions: read` permissions, a checkout of the repository and Node.js (the action runs [`scripts/diagnose-ci-failure.js`](../../../scripts/diagnose-ci-failure.js)).

## Outputs

| Output            | Description                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `has-failures`    | `true` when failed E2E jobs were found.                                                  |
| `dispatch-status` | `not-configured`, `failed` or `requested`. Empty when there was nothing to report.       |

## How it works

1. **Collect.** `diagnose-ci-failure.js collect` lists the jobs of the run through the GitHub API and selects failed jobs whose names start with `React Native (`, `Expo (` or `Android AGP 9 (`. For each job it saves the raw log (capped at 2 MiB) and an excerpt around the `##[error]` lines (at most 40 KB per job and 200 KB in total), and it writes `jobs.json`.
2. **Download evidence.** The action downloads these artifacts of the run, if they exist:
   - `xcodebuild_log_*`
   - `appium_failure_*` (screenshots)
   - `appium_page_source_*`
   - `android_logs_*`: build and test output of `build-android.sh`, the Appium server log and, on failure, an `adb logcat -d` dump. They are written by [`e2e-tests/scripts/capture-android-logs.sh`](../../../e2e-tests/scripts/capture-android-logs.sh) and uploaded by the `Upload Android Logs` step of [`e2e_test.yml`](../../workflows/e2e_test.yml).
3. **Upload.** Whenever failed E2E jobs were found, with or without the dispatch token, the whole output directory is uploaded as the artifact `e2e-diagnosis-data` (kept for 1 day). It contains `jobs.json` (`schemaVersion: 1`, with paths relative to the artifact root), `logs/<job-id>.log`, `excerpts/<job-id>.txt` and `artifacts/<artifact name>/...`.
4. **Dispatch.** When the token is set and the upload succeeded, `diagnose-ci-failure.js dispatch` triggers `diagnose-react-native-e2e.yml` on `develop` in `Adyen/adyen-checkout-sdk-meta` with the input `run_id`. The meta workflow validates the run, downloads `e2e-diagnosis-data` and runs the diagnosis. Its result is shown only in the private job summary of that workflow.
5. **Report.** `diagnose-ci-failure.js report` writes the public summary: a link to the run, the table of failed jobs and one status line:
   - `requested`: the diagnosis was requested, with a link to the dispatched run or to the workflow page.
   - `not-configured`: `SDK_META_DISPATCH_TOKEN` is not set. The data is still uploaded.
   - `failed`: the token is set, but the upload or the dispatch failed. A failed upload also skips the dispatch. For a failed dispatch, the job log has the HTTP status in a warning.

   If the job list could not be fetched, the report says so instead, nothing is uploaded or dispatched, and `dispatch-status` is empty.

## Where to find the results

- **Public job summary** of the **Diagnose E2E failure** job on the workflow run page: the failed jobs and the dispatch status. It contains no diagnosis text.
- **Private job summary** of the `diagnose-react-native-e2e.yml` run in `Adyen/adyen-checkout-sdk-meta`: the diagnosis. Only people with access to that repository can see it.
- **Artifact** `e2e-diagnosis-data` of this run. It is kept for 1 day.

## Security model

- This repository never holds the Factory API key and never runs an AI agent.
- The dispatch token has `Actions: write` on the meta repository only. It is passed to the dispatch step alone, and never to the collect or download steps.
- Everything in `e2e-diagnosis-data` is untrusted data: logs and artifacts can be influenced by pull request content. The meta workflow only reads it.
- Pull requests from forks are skipped, so the secrets are only used for branches of this repository.
- Only small evidence artifacts are downloaded. Fixture and build artifacts are not.
- The dispatch warning contains only the HTTP status, never a response body or a token.

## Running the script locally

Collect the failed E2E jobs of a run. This requires the [GitHub CLI](https://cli.github.com) and a `GH_TOKEN` with read access to the repository's Actions:

```bash
GH_TOKEN=<token> node scripts/diagnose-ci-failure.js collect \
  --repo Adyen/adyen-react-native \
  --run-id <run-id> \
  --out-dir /tmp/e2e-diagnosis \
  [--artifacts-dir <dir>]
```

This writes `jobs.json`, `logs/<job-id>.log` and `excerpts/<job-id>.txt` to the output directory. The artifacts directory defaults to `<out-dir>/artifacts`.

Render the public summary from the collected data:

```bash
node scripts/diagnose-ci-failure.js report \
  --out-dir /tmp/e2e-diagnosis \
  [--dispatch requested|not-configured|failed] \
  [--dispatch-url <url>] \
  [--reason collect-failed] \
  [--report-file <path>]
```

The report is written to `<out-dir>/report.md` by default.

Dispatching needs a `GH_TOKEN` that can dispatch workflows in the meta repository, and it starts a real run there:

```bash
GH_TOKEN=<dispatch-token> node scripts/diagnose-ci-failure.js dispatch --run-id <run-id>
```

Run the tests:

```bash
yarn jest scripts/__tests__/diagnose-ci-failure
```
