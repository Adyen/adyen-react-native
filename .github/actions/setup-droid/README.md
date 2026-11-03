# Setup Droid

A composite action that installs the [Droid](https://factory.ai) CLI, Factory's AI agent, on a Linux runner. It downloads a pinned Droid version from `downloads.factory.ai`, verifies its SHA-256 checksum and adds it to the `PATH` of the following steps.

## Usage

The action is local to this repository, so the calling job must check out the repository first:

```yaml
steps:
  - uses: actions/checkout@v7
    with:
      persist-credentials: false

  - uses: ./.github/actions/setup-droid

  - run: droid exec --help
```

To make a failed installation non-blocking, set `continue-on-error: true` on the step that uses the action and check `steps.<id>.outcome` in later steps. The action itself never ignores errors.

## Inputs

| Input           | Required | Default | Description                                                                         |
| --------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `droid-version` | No       | `1.1.0` | Droid CLI version. Only the default version has a checksum pinned in the action.   |

The action has no outputs. After it runs, `droid` is on the `PATH` of the following steps of the job.

## Behaviour

- **Linux only.** The action fails with an error on macOS and Windows runners.
- **Architecture.** x64 and arm64 runners are supported. On x64 runners without AVX2, the baseline build is used, the same as the official installer.
- **Checksums.** The SHA-256 checksums of the default version are hard-coded in [`action.yml`](action.yml). A non-default `droid-version` is checked against the checksum published next to the binary instead, with a warning.
- **Install location.** The binary is installed to `~/.local/bin/droid`, and `~/.local/bin` is added to `GITHUB_PATH`.
- **Auto-update.** `FACTORY_DROID_AUTO_UPDATE_ENABLED=false` is written to `GITHUB_ENV`, so auto-update is disabled for the following steps of the job.
- **Sanity check.** The action runs `droid --version` after the installation. If it fails, the action fails.

## Updating the Droid version

1. Get the SHA-256 checksums of the new version for `linux/x64`, `linux/x64-baseline` and `linux/arm64`, for example from `https://downloads.factory.ai/factory-cli/releases/<version>/linux/<arch>/droid.sha256`.
2. In [`action.yml`](action.yml), update the default of the `droid-version` input, `pinned_version` and the three `pinned_sha_*` values together.
3. Update the default of the `droid-version` input of callers that pass it through, such as [`diagnose-failure`](../diagnose-failure/action.yml).
