# Swarm Spawner

## Quick Reference
- **npm**: `@taurus-ai/swarm-spawner` (scoped, org: taurus-ai)
- **Tests**: `npm test` (vitest, 65 tests across 4 files)
- **Build**: `npm run build` (tsc, strict mode, ES2022, NodeNext)
- **Publish**: `npm run build && npm test && npm publish --access public`

## @noble/post-quantum API (CRITICAL)
- `ml_dsa65.sign(message, secretKey)` — **message FIRST**, not secretKey
- `ml_dsa65.verify(signature, message, publicKey)` — **signature FIRST**
- `ml_dsa65.keygen(seed)` — requires explicit 32-byte seed
- Import with `.js` extension: `from "@noble/post-quantum/ml-dsa.js"` (NodeNext resolution)
- Same for hashes: `from "@noble/hashes/sha2.js"`, `from "@noble/hashes/utils.js"`
- Key sizes: publicKey=1952 bytes, secretKey=4032 bytes, signature=3309 bytes

## Architecture
- `src/spawner.ts` — Core SwarmSpawner + ModelExecutor + lifecycle orchestration
- `src/pqc-identity.ts` — ML-DSA-65 birth/death certificates (key cache enabled)
- `src/tier-enforcer.ts` — Free/Pro/Enterprise JWT gating
- `src/license.ts` — ML-DSA-65 signed license keys (asymmetric — public key verifies)
- `src/hedera-integration.ts` — HCS audit trails (legacy PQC stubs deprecated)
- `src/model-router.ts` — Fast/balanced/deep tier selection (round-robin)
- `src/result-aggregator.ts` — Pass/fail/duration aggregation

## Spawn Lifecycle
ENFORCE (tier) → ROUTE (model) → CERTIFY BIRTH → EXECUTE (pluggable) → CERTIFY DEATH → AUDIT → DIE

## Gotchas
- `activeAgents.clear()` at start of `spawn()` — prevents stale accumulation
- Free tier only allows `modelTier: "fast"` — tests using balanced/deep need Pro JWT
- PQC key derivation cached per swarmId:agentId — don't derive twice
- npm org `taurus-ai` created at npmjs.com (can't create via CLI)
- `.npmignore` must explicitly exclude `integrations/`, `src-go/`, `src-rs/`
- `verifyPQCSignature()` in hedera-integration.ts is DEPRECATED — always returns false
- `createAuditTopic()` uses `TopicCreateTransaction` (NOT TopicMessageSubmitTransaction)

## Test JWT for Pro tier (use in tests)
```typescript
function proJWT(): string {
  const h = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const b = btoa(JSON.stringify({
    tier: "pro", org: "test", exp: Math.floor(Date.now()/1000) + 3600, features: []
  }));
  return `${h}.${b}.nosig`;
}
```
