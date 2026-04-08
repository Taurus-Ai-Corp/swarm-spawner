# Hacker News Post

**Title**: Show HN: Swarm Spawner -- Ephemeral AI agents with PQC identity and blockchain audit trails

---

Swarm Spawner is a TypeScript SDK for orchestrating ephemeral AI agents where each agent gets a ML-DSA-65 (NIST FIPS 204) signed birth/death certificate and the full lifecycle is logged to Hedera Consensus Service.

**The technical problem**: Multi-agent systems produce outputs, but no existing framework provides tamper-proof provenance for what each agent did. Logs can be edited. Timestamps can be forged. With the EU AI Act (August 2, 2026), regulated deployments need independently verifiable audit trails.

**How it works**:

- Agents spawn, execute one task, and die. No persistent state.
- At spawn, each agent gets a PQC key pair derived from `SHA-256(masterSeed || "swarmId:agentId")` fed into `ml_dsa65.keygen()`.
- Birth certificate: ML-DSA-65 signature over `{agentId, task, model, swarmId, timestamp}`.
- Death certificate: ML-DSA-65 signature over `{agentId, status, resultHash, timestamp}`. The `resultHash` is SHA-256 of the agent's output.
- Audit entries (SWARM_START, AGENT_BIRTH, AGENT_DEATH, SWARM_COMPLETE) are submitted to Hedera HCS -- immutable, 3-5s finality, fractions of a cent per message.
- Verification: `PQCIdentityManager.verify(cert)` -- pure crypto, no external service.

**Design decisions**:

- Pluggable executor (`ModelExecutor` function signature) -- the framework handles routing/identity/audit, you handle the LLM call.
- Model router: round-robin across providers within tiers (fast/balanced/deep). 9 models, 5 providers.
- Real `@noble/post-quantum` v0.6.0 -- not mocked. 3,309-byte signatures, 1,952-byte public keys.
- Hedera over Ethereum: HCS is purpose-built for consensus timestamps, costs ~100x less per message than Ethereum calldata.

65 tests, MIT license, ~800 lines of TypeScript.

GitHub: https://github.com/Taurus-Ai-Corp/swarm-spawner

npm: `@taurus-ai/swarm-spawner`

Playground (real PQC crypto in-browser, zero backend): https://taurus-ai-corp.github.io/swarm-spawner/
