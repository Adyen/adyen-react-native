# Documentation archive

> [!WARNING]
> **Historical, non-authoritative material.** Everything in this `docs/archive/` directory is a
> point-in-time snapshot of an earlier proposal, migration summary, or native bridge rewrite. These
> files are kept for historical reference only and do **not** describe the current behavior of
> `@adyen/react-native`. Do not treat any archived page as a current authority.

For anything current, use these documents instead:

| Concern                                   | Current authority                                      |
| ----------------------------------------- | ------------------------------------------------------ |
| Consumer migration steps                  | [../MigrationGuide.md](../MigrationGuide.md)           |
| System overview and checkout lifecycle    | [../Architecture.md](../Architecture.md)               |
| Platform/flow/presenter capability status | [../FeatureSupport.md](../FeatureSupport.md)           |
| TypeScript topology and dependencies      | [../js-architecture.md](../js-architecture.md)         |
| iOS/Android internals and differences     | [../native-architecture.md](../native-architecture.md) |
| Chronological session/advanced/etc. flows | [../public-api-flows.md](../public-api-flows.md)       |

## Archived documents

| File                                                                     | What it captured (historical)                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| [v2-MigrationGuide.md](./v2-MigrationGuide.md)                           | v2 breaking/non-breaking changes (Android theme requirement, redirect scheme deprecation, manifest service).       |
| [v6-api-migration-summary.md](./v6-api-migration-summary.md)             | v5 → v6 alpha public API redesign summary: architecture decisions, renames, removed APIs, and native bridge state. |
| [v6-public-api-proposal.md](./v6-public-api-proposal.md)                 | The implemented v6-alpha public API surface with class/lifecycle/flow diagrams as captured at that time.           |
| [consumer-migration-guide.md](./consumer-migration-guide.md)             | An earlier consumer migration guide titled `2.12.0 to 3.0.0-alpha.1`, superseded by the current migration guide.   |
| [android-bridge-migration-guide.md](./android-bridge-migration-guide.md) | The Android native bridge v5 → v6.0.0-alpha.1 rewrite: module/type relocations, Drop-in service, and controllers.  |
| [ios-bridge-migration-guide.md](./ios-bridge-migration-guide.md)         | The iOS native bridge v5 → v6.0.0-alpha.1 rewrite: closure callbacks, continuations, and module consolidation.     |
