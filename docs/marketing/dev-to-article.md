---
title: "I Built an Agent Framework Where Every AI Gets a Quantum-Safe Death Certificate"
published: false
description: "What happens when you combine post-quantum cryptography, blockchain audit trails, and ephemeral AI agents? You get death certificates for robots."
tags: typescript, ai, security, opensource
canonical_url: https://github.com/Taurus-Ai-Corp/swarm-spawner
cover_image: https://placeholder.dev/swarm-spawner-cover.png
---

# I Built an Agent Framework Where Every AI Gets a Quantum-Safe Death Certificate

Let me explain how I ended up writing cryptographic death certificates for AI agents.

I was building a multi-agent system -- the kind where you spawn a bunch of LLM-powered agents to do parallel work, then collect the results. Standard stuff in 2026. But I kept running into the same problem: when something went wrong, I had no idea which agent did what, when it did it, or whether the logs I was reading had been tampered with.

Then I read the EU AI Act text. Article 12. Logging capabilities. Article 14. Human oversight. The deadline is August 2, 2026. That is four months away.

So I built [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) -- an open-source TypeScript SDK where every AI agent gets a quantum-safe identity at birth, a cryptographic death certificate when it finishes, and an immutable audit trail on Hedera's public ledger.

Yes, death certificates. For AI agents. I know how it sounds.

## The Problem Nobody Talks About

Every agent framework gives you a way to spawn agents. None of them give you a way to *prove* what those agents did.

Think about it: you spawn 50 agents to process customer data. One of them hallucinates and makes a bad decision. A regulator asks you to demonstrate what happened. What do you show them? Console logs? A JSON file that anyone with write access could have edited?

That is not going to fly under the EU AI Act. And it is definitely not going to fly when quantum computers can forge RSA and ECDSA signatures in polynomial time.

## The Lifecycle

Every agent in Swarm Spawner goes through a strict lifecycle:

```
ENFORCE -> ROUTE -> CERTIFY BIRTH -> EXECUTE -> CERTIFY DEATH -> AUDIT -> DIE
```

1. **ENFORCE** -- Tier enforcement checks. Are you within your agent limit? Is your license valid?
2. **ROUTE** -- The ModelRouter picks an LLM based on the task tier (fast/balanced/deep) using round-robin across providers.
3. **CERTIFY BIRTH** -- The agent gets a PQC-signed birth certificate. ML-DSA-65 (NIST FIPS 204). Real cryptography.
4. **EXECUTE** -- Your pluggable executor runs the agent's task against whatever LLM you want.
5. **CERTIFY DEATH** -- When the agent completes (or fails), it gets a death certificate. The death cert includes a SHA-256 hash of the agent's output.
6. **AUDIT** -- The full lifecycle is recorded on Hedera Consensus Service (HCS). Immutable, timestamped, publicly verifiable.
7. **DIE** -- The agent is destroyed. No persistent state. No zombie processes.

## Show Me the Code

Here is what spawning a swarm looks like:

```typescript
import { SwarmSpawner, type ModelExecutor } from "@taurus-ai/swarm-spawner";

// Bring your own LLM -- Anthropic, OpenAI, Ollama, anything
const executor: ModelExecutor = async (agent, config) => {
  const response = await anthropic.messages.create({
    model: config.model,
    messages: [{ role: "user", content: agent.task }],
  });
  return response.content[0].text;
};

const spawner = new SwarmSpawner({
  executor,
  enableAuditTrail: true,
  hederaNetwork: "testnet",
});

const result = await spawner.spawn({
  tasks: [
    { id: "analyze", description: "Find security vulnerabilities", input: { code }, modelTier: "deep" },
    { id: "review",  description: "Check code style and patterns", input: { code }, modelTier: "balanced" },
    { id: "test",    description: "Generate unit tests", input: { code }, modelTier: "fast" },
  ],
  strategy: "parallel",
});

console.log(`${result.successCount}/${result.totalAgents} agents completed`);
```

Three agents, three different model tiers, running in parallel. Each one gets a birth certificate, does its job, gets a death certificate, and the whole thing is logged to Hedera.

## The PQC Part (Why Quantum-Safe Matters)

I used ML-DSA-65 from `@noble/post-quantum` -- the NIST FIPS 204 standard. This is not a toy implementation. The signatures are 3,309 bytes. The public keys are 1,952 bytes. It is real post-quantum cryptography running in pure JavaScript.

Here is how the identity system works:

```typescript
import { PQCIdentityManager } from "@taurus-ai/swarm-spawner";
import { randomBytes } from "@noble/hashes/utils.js";

const pqc = new PQCIdentityManager({
  masterSeed: randomBytes(32),
});

// Key derivation: SHA-256(masterSeed || "swarmId:agentId") -> ml_dsa65.keygen()
// Each agent gets a unique, deterministic key pair

const birthCert = pqc.issueBirthCertificate(agent, swarmId);
// { type: "birth", algorithm: "ML-DSA-65", signature: Uint8Array(3309), ... }

const deathCert = pqc.issueDeathCertificate(completedAgent, swarmId);
// { type: "death", resultHash: "a3f2...", algorithm: "ML-DSA-65", ... }

// Anyone can verify -- you only need the public key
const isValid = PQCIdentityManager.verify(birthCert); // true
```

The death certificate includes a `resultHash` -- a SHA-256 hash of the agent's output. So you can prove not just that an agent existed and died, but exactly what it produced. If someone changes the output, the hash breaks. If someone forges the certificate, the ML-DSA-65 signature breaks. And unlike RSA/ECDSA, this holds up against quantum computers.

## Why Hedera Instead of Ethereum

I get this question a lot. Three reasons:

1. **Cost** -- Hedera Consensus Service messages cost fractions of a cent. Ethereum gas for the same operation? Dollars.
2. **Finality** -- HCS messages achieve finality in 3-5 seconds. No waiting for block confirmations.
3. **Purpose-built** -- HCS is a consensus timestamp service. You submit a message, you get an immutable timestamp and sequence number. That is exactly what an audit trail needs. I am not trying to run smart contracts here.

Each swarm run creates audit entries: `SWARM_START`, `AGENT_BIRTH`, `AGENT_DEATH`, `SWARM_COMPLETE`. All submitted to an HCS topic, all publicly verifiable on a Hedera mirror node.

## The Model Router

One thing I am proud of is how model selection works. You do not pick a specific model -- you pick a *tier*:

| Tier | Use Case | Models |
|------|----------|--------|
| **Fast** | Simple tasks, formatting | Groq Llama 3.1, Ollama Qwen, Gemini Flash |
| **Balanced** | Standard analysis | Claude Haiku, GPT-4o Mini, Gemini Pro |
| **Deep** | Complex reasoning | Claude Sonnet, GPT-4 Turbo, DeepSeek Coder |

The router uses round-robin within each tier. So if you spawn 9 agents at the "balanced" tier, you get 3 on Claude, 3 on GPT-4o Mini, and 3 on Gemini Pro. Automatic provider diversification, no config needed.

## The Pluggable Executor

Swarm Spawner does not lock you into any LLM provider. The `ModelExecutor` is a simple function signature:

```typescript
type ModelExecutor = (
  agent: EphemeralAgent,
  config: ModelConfig,
) => Promise<unknown>;
```

The framework handles routing, identity, certification, and audit. You handle the actual LLM call. This means you can use Anthropic, OpenAI, Ollama, Groq, or that weird local model you fine-tuned on your gaming PC at 3am. The framework does not care.

## Tier Enforcement

The free tier gives you 5 agents per spawn, testnet only, fast models only. This is deliberate -- it is enough to evaluate the framework, but if you are running production workloads with PQC signing and mainnet audit trails, you need Pro ($49/month).

```typescript
const spawner = new SwarmSpawner({
  licenseKey: "your-pro-license-key",
  pqcIdentity: { masterSeed: randomBytes(32) },
  hederaNetwork: "mainnet",
  executor: yourExecutor,
});
// Unlocks: unlimited agents, all model tiers, PQC signing, mainnet audit
```

Enterprise gets custom agent limits and dedicated support. But honestly, most teams will be fine on Pro.

## Try It Right Now

I built an [interactive playground](https://taurus-ai-corp.github.io/swarm-spawner/) where you can spawn PQC-certified agents in your browser. Real ML-DSA-65 cryptography running client-side -- 21KB noble bundle, zero backend, zero API keys. You can configure tasks, watch the lifecycle, inspect 3,309-byte signatures, and copy the generated TypeScript code.

It is the fastest way to understand what this thing does.

## Numbers

- 65 tests passing (vitest)
- 9 models across 5 providers
- 7 source modules, ~800 lines of TypeScript
- MIT license (with patent notice)
- `@noble/post-quantum` v0.6.0 for real NIST FIPS 204 crypto
- `@hashgraph/sdk` v2.81.0 for Hedera HCS

## What I Learned

Building this taught me a few things:

1. **PQC is production-ready.** The `@noble/post-quantum` library by Paul Miller is excellent. ML-DSA-65 keygen takes ~2ms. Signing is fast. Verification is fast. The main cost is the signature size (3,309 bytes), which is fine for audit use cases.

2. **Ephemeral agents are underrated.** Every other framework assumes agents persist. But for most batch processing -- code review, data analysis, testing -- you want agents that do one job and disappear. No state management. No garbage collection of stale agents.

3. **Compliance is a feature, not a burden.** The EU AI Act deadline is going to catch a lot of teams off guard. Having tamper-proof audit trails is not just regulatory box-checking -- it is genuinely useful for debugging multi-agent systems.

## Links

- **GitHub**: [github.com/Taurus-Ai-Corp/swarm-spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner)
- **npm**: `npm install @taurus-ai/swarm-spawner`
- **Playground**: [taurus-ai-corp.github.io/swarm-spawner](https://taurus-ai-corp.github.io/swarm-spawner/)
- **EU AI Act text**: [artificialintelligenceact.eu](https://artificialintelligenceact.eu/)

If you have questions, open an issue or find me in the comments. I spent an unreasonable amount of time getting ML-DSA-65 key derivation to work deterministically, and I am happy to talk about it.
