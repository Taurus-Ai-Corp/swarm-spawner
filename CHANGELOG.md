# Changelog

## [0.4.0] - 2026-04-04

### Added
- `LicenseManager` — ML-DSA-65 signed license keys (asymmetric PQC, NIST FIPS 204)
- `npx @taurus-ai/swarm-spawner init` CLI — scaffolds example project
- Demo GIF in README (recorded with vhs)
- Stripe billing reference implementation (`examples/stripe-billing/server.ts`)
- `exports.default` field for CJS/tsx compatibility
- `CLAUDE.md` project instructions for future sessions
- GitHub Actions CI workflow

### Changed
- License keys upgraded from HMAC-SHA256 to ML-DSA-65 (quantum-safe, asymmetric)
- PQC key derivation now cached between birth/death certificates (2x faster)
- `activeAgents` cleared between `spawn()` calls (bug fix)
- `mergeResults()` computes correct weighted success rate (bug fix)
- Removed dead code: `ModelRouter.cache`, `selectModelForTask`, `mintCredential`, SDK re-exports
- `AuditEntry.action` type-narrowed to union literal
- Agent/swarm IDs use `crypto.randomUUID()` instead of `Math.random()`
- Deprecated `signWithPQC()` / `verifyPQCSignature()` — use PQCIdentityManager instead

### Security
- Removed fake PQC stubs (generatePQCKeyPair, pqcSign) — replaced by real ML-DSA-65
- `verifyPQCSignature()` now returns `false` (was always returning `true`)
- License keys are asymmetric — public key embedded in npm package cannot forge keys

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
