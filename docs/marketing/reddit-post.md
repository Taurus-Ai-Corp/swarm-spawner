# Reddit Post

**Subreddits**: r/typescript, r/artificial

**Title**: I spent 3 months building PQC death certificates for AI agents. AMA.

---

I could not find an agent framework that answered the question "prove what this agent did" in a way that would survive a regulatory audit. So I built one.

**Swarm Spawner** is an open-source TypeScript SDK for ephemeral AI agents. The weird part: every agent gets a quantum-safe birth certificate when it spawns and a death certificate when it completes. Both are signed with ML-DSA-65 (NIST FIPS 204 -- actual post-quantum crypto, not a placeholder). The full lifecycle is logged to Hedera Consensus Service, so the audit trail is immutable and independently verifiable.

**The lifecycle**: ENFORCE -> ROUTE -> CERTIFY BIRTH -> EXECUTE -> CERTIFY DEATH -> AUDIT -> DIE

**Why I built this**: The EU AI Act becomes enforceable August 2, 2026. If you deploy AI agents that make decisions, you need tamper-proof audit logs. Console.log is not going to impress a regulator.

**Quick code sample**:

```typescript
import { SwarmSpawner } from "@taurus-ai/swarm-spawner";

const spawner = new SwarmSpawner({
  executor: async (agent, config) => {
    return await yourLLM.generate(agent.task);
  },
  enableAuditTrail: true,
  hederaNetwork: "testnet",
});

const result = await spawner.spawn({
  tasks: [
    { id: "analyze", description: "Find vulnerabilities", input: { code }, modelTier: "deep" },
    { id: "review",  description: "Check style", input: { code }, modelTier: "fast" },
  ],
  strategy: "parallel",
});
// Each agent got PQC-signed birth/death certs + Hedera audit entries
```

**Key details**:

- TypeScript-first, MIT license
- Pluggable executor -- bring any LLM (Anthropic, OpenAI, Ollama, Groq, etc.)
- Real `@noble/post-quantum` ML-DSA-65 -- 3,309 byte signatures, not stubs
- Hedera HCS for immutable audit trails (fractions of a cent per entry)
- 9 models across 5 providers, auto-routed by tier (fast/balanced/deep)
- 65 tests passing, vitest
- Free tier: 5 agents, testnet. Pro $49/mo: unlimited, PQC signing, mainnet.
- Interactive playground with real PQC crypto in-browser: https://taurus-ai-corp.github.io/swarm-spawner/

**What I learned**: ML-DSA-65 keygen is ~2ms in JS. The signatures are huge (3,309 bytes) but for audit logs that is fine. The `@noble/post-quantum` library by paulmillr is genuinely excellent. Ephemeral agents (spawn, do one job, die) are simpler than persistent agents for most batch workloads -- no state management, no garbage collection of stale agents.

**The uncomfortable truth**: Most agent frameworks assume you trust your own logs. In a regulated environment, you cannot. You need logs that are independently verifiable by a third party who does not trust you at all. That is what Hedera HCS gives you.

**Links**:

- GitHub: https://github.com/Taurus-Ai-Corp/swarm-spawner
- npm: `npm install @taurus-ai/swarm-spawner`
- Playground: https://taurus-ai-corp.github.io/swarm-spawner/

Happy to answer questions about PQC key derivation, the Hedera integration, or why I think death certificates for AI agents is a completely normal thing to build.
