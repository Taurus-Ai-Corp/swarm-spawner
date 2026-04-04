# Changelog

## [0.2.0] - 2026-04-03

### Breaking Changes
- Package entry point now correctly resolves (`dist/index.js` barrel export)

### Added
- `ModelExecutor` type — pluggable model execution interface
- `defaultExecutor` — echo executor for testing
- `SwarmConfig.executor` — optional custom executor in config
- `PQCIdentityManager` — real ML-DSA-65 birth/death certificates (NIST FIPS 204)
- `TierEnforcer` — Free/Pro/Enterprise tier gating with JWT license keys
- `agent:model:start` and `agent:model:complete` observability events
- `.npmignore` — clean tarball (dist/ only)

### Fixed
- `createAuditTopic()` uses `TopicCreateTransaction` (was incorrectly using `TopicMessageSubmitTransaction`)
- Hedera client respects `mainnet` parameter (was always testnet)
- npm tarball no longer includes source files, IDE integrations, or Go/Rust code

### Changed
- Package size: 90.5 KB → 54.4 KB (40% smaller)
- Test suite: 13 → 46 tests across 3 files

## [0.1.0] - 2026-04-01

### Added
- Initial release
- SwarmSpawner with parallel/sequential execution
- ModelRouter with fast/balanced/deep tier selection
- HederaIntegration for audit trails (PQC stubs)
- ResultAggregator for pass/fail metrics
- Multi-language stubs (Python, Rust, Go)
- IDE integrations (Claude Code, Cursor, VS Code)
