# Swarm Spawner — Approach C: Crypto-AI Convergence Protocol

> Design Spec v1.0 | 2026-04-02
> "Every AI agent gets a quantum-safe identity, an immutable audit trail, and a Hedera wallet."

---

## 1. Positioning

Swarm Spawner occupies the **only uncontested intersection** in the AI agent orchestration market:

```
                    ┌──────────────────┐
                    │  Ephemeral Agents │ ← OpenAI Swarm (abandoned)
                    │  (spawn & die)   │   Julep (shut down)
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐  ┌──▼──────────┐  ┌▼──────────────┐
     │ PQC Identity   │  │ Blockchain  │  │ Model-Agnostic │
     │ (ML-DSA-65)    │  │ Audit Trail │  │ Execution      │
     │                │  │ (Hedera HCS)│  │ (Pluggable)    │
     └────────┬───────┘  └──┬──────────┘  └┬──────────────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼─────────┐
                    │  SWARM SPAWNER   │
                    │  (Only framework │
                    │   at this nexus) │
                    └──────────────────┘
```

**No competitor has all three.** Coinbase AgentKit has wallets (not audit). Zero have PQC. OpenAI Swarm and Julep had ephemeral concepts but are dead/abandoned.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SwarmSpawner                          │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ModelRouter  │  │ PQCIdentity  │  │ TierEnforcer  │  │
│  │             │  │              │  │               │  │
│  │ fast/       │  │ birth cert   │  │ free/pro/     │  │
│  │ balanced/   │  │ death cert   │  │ enterprise    │  │
│  │ deep        │  │ key derivation│ │ JWT license   │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│  ┌──────▼──────────────────────────────────────────────┐│
│  │              EphemeralAgent Lifecycle                ││
│  │                                                     ││
│  │  SPAWN → CERTIFY → EXECUTE → SIGN → AUDIT → DIE    ││
│  │                       │                             ││
│  │              ┌────────▼────────┐                    ││
│  │              │ ModelExecutor   │ ← Pluggable        ││
│  │              │ (user-provided) │                    ││
│  │              └─────────────────┘                    ││
│  └─────────────────────────────────────────────────────┘│
│         │                │                              │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌────────────────┐ │
│  │ Result      │  │ Hedera       │  │ EventEmitter   │ │
│  │ Aggregator  │  │ Integration  │  │ (observability)│ │
│  │             │  │              │  │                │ │
│  │ pass/fail   │  │ HCS topics   │  │ agent:start    │ │
│  │ rates       │  │ audit trail  │  │ agent:complete │ │
│  │ durations   │  │ credentials  │  │ model:start    │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Component Inventory

| Component | File | Status | Purpose |
|-----------|------|--------|---------|
| SwarmSpawner | `src/spawner.ts` | Done | Core orchestrator, lifecycle management |
| ModelRouter | `src/model-router.ts` | Done | Tier-based model selection (round-robin) |
| ModelExecutor | `src/spawner.ts` | Done | Pluggable LLM execution interface |
| HederaIntegration | `src/hedera-integration.ts` | Partial | HCS audit trails, topic management |
| ResultAggregator | `src/result-aggregator.ts` | Done | Pass/fail aggregation |
| **PQCIdentity** | `src/pqc-identity.ts` | **NEW** | Agent birth/death certs, key derivation |
| **TierEnforcer** | `src/tier-enforcer.ts` | **NEW** | Free/Pro/Enterprise gating |
| **AI SDK Adapter** | Separate package | **NEW** | Vercel AI SDK ModelExecutor |

---

## 3. Pluggable Model Executor (IMPLEMENTED)

```typescript
// The interface — consumers implement this
export type ModelExecutor = (
  agent: EphemeralAgent,
  config: ModelConfig,
) => Promise<unknown>;

// Default echo executor for testing
export const defaultExecutor: ModelExecutor = async (agent) => {
  return { agentId: agent.id, result: `Processed: ${agent.task}` };
};

// Usage — bring your own LLM
const spawner = new SwarmSpawner({
  executor: async (agent, config) => {
    const response = await anthropic.messages.create({
      model: config.model,
      messages: [{ role: "user", content: agent.task }],
    });
    return response.content[0].text;
  },
});
```

Events emitted: `agent:model:start`, `agent:model:complete` — both carry `{ agentId, model, timestamp }`.

**Tests: 13/13 passing** (default executor, custom executor, timeout, error handling, events).

---

## 4. PQC Identity System (NEW)

### 4.1 Design

Every ephemeral agent receives a **quantum-safe identity** at birth:

```
Master Key (ML-DSA-65, 32-byte seed)
    │
    ├── derive(swarmId + agentId) → Agent Ephemeral Key
    │       │
    │       ├── Birth Certificate (signed)
    │       │     ├── agentId
    │       │     ├── task description
    │       │     ├── model tier
    │       │     ├── timestamp
    │       │     └── swarm context hash
    │       │
    │       └── Death Certificate (signed)
    │             ├── result hash (SHA-256)
    │             ├── status (completed/failed)
    │             ├── duration
    │             ├── audit trail reference (HCS topic + sequence)
    │             └── timestamp
    │
    └── Key destroyed after death certificate signed
```

### 4.2 Interfaces

```typescript
// src/pqc-identity.ts

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa";
import { sha256 } from "@noble/hashes/sha2";
import { randomBytes, bytesToHex } from "@noble/hashes/utils";

export interface AgentIdentity {
  agentId: string;
  publicKey: Uint8Array;
  birthCertificate: SignedCertificate;
  deathCertificate?: SignedCertificate;
}

export interface SignedCertificate {
  type: "birth" | "death";
  payload: Record<string, unknown>;
  signature: Uint8Array;
  publicKey: Uint8Array;
  algorithm: "ML-DSA-65";
  timestamp: string;
}

export interface PQCIdentityConfig {
  masterSeed: Uint8Array; // 32 bytes
}

export class PQCIdentityManager {
  private masterSeed: Uint8Array;

  constructor(config: PQCIdentityConfig) {
    this.masterSeed = config.masterSeed;
  }

  /** Derive a deterministic per-agent key from master + agent context */
  deriveAgentKey(swarmId: string, agentId: string): {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
  } {
    const context = new TextEncoder().encode(`${swarmId}:${agentId}`);
    const derivedSeed = sha256(
      new Uint8Array([...this.masterSeed, ...context])
    );
    return ml_dsa65.keygen(derivedSeed);
  }

  /** Issue birth certificate when agent spawns */
  issueBirthCertificate(
    agent: { id: string; task: string; model: { model: string } },
    swarmId: string,
  ): SignedCertificate {
    const keyPair = this.deriveAgentKey(swarmId, agent.id);
    const payload = {
      type: "birth" as const,
      agentId: agent.id,
      task: agent.task,
      model: agent.model.model,
      swarmId,
      timestamp: new Date().toISOString(),
    };

    const message = new TextEncoder().encode(JSON.stringify(payload));
    const signature = ml_dsa65.sign(keyPair.secretKey, message);

    return {
      type: "birth",
      payload,
      signature,
      publicKey: keyPair.publicKey,
      algorithm: "ML-DSA-65",
      timestamp: payload.timestamp,
    };
  }

  /** Issue death certificate when agent completes/fails */
  issueDeathCertificate(
    agent: { id: string; status: string; output?: unknown; error?: string },
    swarmId: string,
    auditRef?: { topicId: string; sequenceNumber: number },
  ): SignedCertificate {
    const keyPair = this.deriveAgentKey(swarmId, agent.id);

    const resultHash = bytesToHex(
      sha256(new TextEncoder().encode(JSON.stringify(agent.output ?? agent.error)))
    );

    const payload = {
      type: "death" as const,
      agentId: agent.id,
      status: agent.status,
      resultHash,
      auditRef,
      timestamp: new Date().toISOString(),
    };

    const message = new TextEncoder().encode(JSON.stringify(payload));
    const signature = ml_dsa65.sign(keyPair.secretKey, message);

    return {
      type: "death",
      payload,
      signature,
      publicKey: keyPair.publicKey,
      algorithm: "ML-DSA-65",
      timestamp: payload.timestamp,
    };
  }

  /** Verify any certificate */
  static verify(cert: SignedCertificate): boolean {
    const message = new TextEncoder().encode(JSON.stringify(cert.payload));
    return ml_dsa65.verify(cert.publicKey, message, cert.signature);
  }
}
```

### 4.3 Key Derivation Scheme

```
masterSeed (32 bytes, from env PQC_MASTER_SEED or randomBytes(32))
    │
    │  SHA-256(masterSeed ║ UTF8("swarmId:agentId"))
    │
    ▼
derivedSeed (32 bytes)
    │
    │  ml_dsa65.keygen(derivedSeed)
    │
    ▼
{ publicKey, secretKey } ← deterministic, reproducible for verification
```

**Why deterministic?** Anyone with the master seed + agent context can re-derive the key to verify certificates. The master seed is the single secret.

### 4.4 Integration with SwarmSpawner

```typescript
// Updated SwarmConfig
export interface SwarmConfig {
  // ... existing fields ...
  pqcIdentity?: PQCIdentityConfig; // replaces pqcKeyPair
}

// In spawn() lifecycle:
// 1. SPAWN agent
// 2. CERTIFY: issueBirthCertificate()
// 3. EXECUTE: this.executor(agent, model)
// 4. SIGN: issueDeathCertificate()
// 5. AUDIT: submit both certs to Hedera HCS
// 6. DIE: agent removed from activeAgents
```

---

## 5. Hedera Audit Trail (ENHANCED)

### 5.1 Topic-per-Swarm Pattern

Each `spawn()` call creates a dedicated HCS topic. All agent lifecycle events are recorded as topic messages.

```
spawn() called
    │
    ├── TopicCreateTransaction → topicId
    │
    ├── Message 1: SWARM_START { taskCount, strategy, timestamp }
    │
    ├── Message 2: AGENT_BIRTH { birthCertificate, agentId }
    ├── Message 3: AGENT_BIRTH { birthCertificate, agentId }
    │   ... (one per agent)
    │
    ├── Message N: AGENT_DEATH { deathCertificate, agentId, result_hash }
    ├── Message N+1: AGENT_DEATH { deathCertificate, agentId, result_hash }
    │   ... (one per agent)
    │
    └── Message FINAL: SWARM_COMPLETE { successRate, duration, topicId }
```

### 5.2 Structured Audit Entry (v2)

```typescript
export interface AuditEntryV2 {
  version: 2;
  id: string;
  timestamp: string;
  action: "SWARM_START" | "AGENT_BIRTH" | "AGENT_DEATH" | "SWARM_COMPLETE";
  swarmId: string;
  agentId?: string;
  payload: Record<string, unknown>;
  pqcSignature?: string;   // base64 ML-DSA-65 signature
  pqcPublicKey?: string;   // base64 public key for verification
  topicId: string;
  sequenceNumber?: number;
}
```

### 5.3 Batch Submission

For cost efficiency, agent birth certificates are batched into a single topic message per chunk (respecting Hedera's 1KB message limit):

```typescript
// Batch pattern
const batchPayload = agents
  .map(a => ({ agentId: a.id, birthCert: a.birthCertificate }))
  .filter(batch => JSON.stringify(batch).length < 1024);

// Submit as single message if under 1KB, split if over
```

### 5.4 Verification API

```typescript
class HederaIntegration {
  /** Verify a complete swarm lifecycle from its topic ID */
  async verifySwarmAuditTrail(topicId: string): Promise<{
    valid: boolean;
    swarmId: string;
    agentCount: number;
    allCertificatesValid: boolean;
    timeline: AuditEntryV2[];
    errors: string[];
  }>;
}
```

---

## 6. Tier Enforcement

### 6.1 Tier Definitions

| Feature | Free | Pro ($49/mo) | Enterprise (Custom) |
|---------|:----:|:---:|:---:|
| Max agents per spawn | 5 | Unlimited | Custom |
| Max spawns per day | 20 | 1,000 | Unlimited |
| Hedera network | Testnet | Mainnet | Mainnet |
| PQC signing | No | Yes | Yes |
| Audit trail | Console logs | HCS topics | HCS + export API |
| Model tiers | Fast only | All | All + custom |
| AI SDK adapter | Yes | Yes | Yes |
| EU AI Act report | No | Basic | Full compliance |
| On-prem LLM support | No | No | Ollama/vLLM |
| SLA | None | Email | Dedicated |

### 6.2 License Key (JWT)

```typescript
// src/tier-enforcer.ts

export type Tier = "free" | "pro" | "enterprise";

export interface LicensePayload {
  tier: Tier;
  org: string;
  exp: number;        // Unix timestamp
  maxAgents?: number;  // enterprise custom limit
  features: string[];  // enabled feature flags
}

export class TierEnforcer {
  private tier: Tier;
  private license?: LicensePayload;

  constructor(licenseKey?: string) {
    if (!licenseKey) {
      this.tier = "free";
      return;
    }
    // Decode JWT (no verification library needed — use base64 decode)
    // Production: verify against TAURUS public key
    this.license = this.decodeLicense(licenseKey);
    this.tier = this.license.tier;
  }

  enforce(check: {
    agentCount?: number;
    network?: "testnet" | "mainnet";
    pqcSigning?: boolean;
    modelTier?: "fast" | "balanced" | "deep";
  }): void {
    if (this.tier === "free") {
      if ((check.agentCount ?? 0) > 5)
        throw new Error("Free tier: max 5 agents. Upgrade at swarm-spawner.dev/pricing");
      if (check.network === "mainnet")
        throw new Error("Free tier: testnet only. Upgrade for mainnet access.");
      if (check.pqcSigning)
        throw new Error("Free tier: PQC signing requires Pro. Upgrade at swarm-spawner.dev/pricing");
      if (check.modelTier && check.modelTier !== "fast")
        throw new Error("Free tier: fast models only. Upgrade for balanced/deep.");
    }
  }

  getTier(): Tier { return this.tier; }

  private decodeLicense(key: string): LicensePayload {
    const parts = key.split(".");
    if (parts.length !== 3) throw new Error("Invalid license key format");
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Date.now() / 1000) {
      throw new Error("License expired. Renew at swarm-spawner.dev/pricing");
    }
    return payload;
  }
}
```

### 6.3 Integration

```typescript
// SwarmConfig addition
export interface SwarmConfig {
  // ... existing fields ...
  licenseKey?: string;  // JWT from swarm-spawner.dev
}

// In constructor:
this.tierEnforcer = new TierEnforcer(config.licenseKey);

// In spawn():
this.tierEnforcer.enforce({
  agentCount: request.tasks.length,
  network: this.config.hederaNetwork,
  pqcSigning: !!this.config.pqcIdentity,
});
```

---

## 7. AI SDK Adapter Package

Separate npm package: `@taurus-ai/swarm-spawner-ai-sdk`

```typescript
// @taurus-ai/swarm-spawner-ai-sdk/src/index.ts

import { generateText } from "ai";
import type { ModelExecutor, EphemeralAgent } from "@taurus-ai/swarm-spawner";
import type { LanguageModel } from "ai";

/**
 * Creates a ModelExecutor that uses Vercel AI SDK's generateText().
 * Supports all AI SDK providers (OpenAI, Anthropic, Google, etc.)
 */
export function createAISDKExecutor(
  modelFactory: (config: { provider: string; model: string }) => LanguageModel,
): ModelExecutor {
  return async (agent, config) => {
    const model = modelFactory({
      provider: config.provider,
      model: config.model,
    });

    const { text, usage } = await generateText({
      model,
      prompt: agent.task,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    });

    return {
      text,
      usage,
      provider: config.provider,
      model: config.model,
    };
  };
}

// Usage:
// import { openai } from "@ai-sdk/openai";
// import { createAISDKExecutor } from "@taurus-ai/swarm-spawner-ai-sdk";
//
// const spawner = new SwarmSpawner({
//   executor: createAISDKExecutor(({ model }) => openai(model)),
// });
```

---

## 8. Agent Lifecycle (Complete Flow)

```
User calls spawn({ tasks, strategy })
    │
    ├── 1. TierEnforcer.enforce() ← check limits
    │
    ├── 2. HederaIntegration.createAuditTopic() ← one topic per swarm
    │
    ├── 3. ModelRouter.selectModel() per task ← tier-based selection
    │
    ├── 4. For each agent (parallel or sequential):
    │       │
    │       ├── 4a. PQCIdentity.issueBirthCertificate()
    │       ├── 4b. emit("agent:start")
    │       ├── 4c. emit("agent:model:start")
    │       ├── 4d. ModelExecutor(agent, model) ← user's LLM call
    │       ├── 4e. emit("agent:model:complete")
    │       ├── 4f. PQCIdentity.issueDeathCertificate()
    │       ├── 4g. HederaIntegration.submitAudit(birth + death certs)
    │       ├── 4h. emit("agent:complete")
    │       └── 4i. Agent removed from activeAgents (DIES)
    │
    ├── 5. ResultAggregator.aggregate() ← compile results
    │
    ├── 6. HederaIntegration.logSwarmComplete() ← final audit entry
    │
    └── 7. emit("complete") ← return AggregatedResult
```

---

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| Executor throws | Agent marked failed, error captured, lifecycle continues |
| Executor timeout | Agent marked failed with timeout error |
| Hedera unavailable | Audit entries logged to console (graceful degradation) |
| PQC signing fails | Agent still completes, cert marked unsigned |
| Tier limit exceeded | Throws immediately before any agents spawn |
| Invalid license | Falls back to free tier with warning |
| All agents fail | Returns AggregatedResult with 0% success rate |

---

## 10. Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | ModelExecutor, PQCIdentity, TierEnforcer, ModelRouter |
| Integration | Vitest | Full spawn→certify→execute→audit→verify lifecycle |
| Hedera | Testnet | Topic creation, message submission, verification |
| PQC | @noble/post-quantum | Key derivation, sign/verify round-trip |
| Load | Custom script | 100 concurrent agents, measure throughput |

### Test Matrix

```
Current:  13/13 passing (executor + router + hedera basics)
Target:   35+ tests
  - PQCIdentity: keygen, birth cert, death cert, verify, derive (5)
  - TierEnforcer: free limits, pro access, expired license, invalid key (4)
  - Full lifecycle: spawn→certify→execute→sign→audit (3)
  - AI SDK adapter: createAISDKExecutor, provider mapping (3)
  - Edge cases: 0 tasks, 100 tasks, mixed fail/success (3)
  - Hedera verification: verifySwarmAuditTrail round-trip (2)
  - Events: all 6 event types fired in correct order (2)
```

---

## 11. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Master seed exposure | Env var only (`PQC_MASTER_SEED`), never in code or logs |
| Key derivation predictability | SHA-256 of seed+context, computationally infeasible to reverse |
| Hedera key leakage | Operator keys via env vars, never serialized |
| License key forgery | JWT signed with TAURUS private key (RS256) |
| Executor injection | Executor runs user code — document sandbox recommendations |
| Audit trail tampering | Hedera HCS is append-only, immutable by design |
| PQC algorithm downgrade | Only ML-DSA-65, no fallback to classical algorithms |

---

## 12. README Hero Section (Target)

```markdown
# Swarm Spawner

> Every AI agent gets a quantum-safe identity, an immutable audit trail,
> and a Hedera wallet.

Spawn → Certify → Execute → Sign → Audit → Die

The ephemeral AI agent framework that OpenAI Swarm should have been.
Built for the EU AI Act deadline (Aug 2, 2026).

| Feature | Swarm Spawner | CrewAI | LangGraph | AutoGen |
|---------|:---:|:---:|:---:|:---:|
| Ephemeral agents | ✅ | ❌ | ❌ | ❌ |
| PQC identity (ML-DSA-65) | ✅ | ❌ | ❌ | ❌ |
| Blockchain audit (Hedera) | ✅ | ❌ | ❌ | ❌ |
| Model-agnostic | ✅ | ✅ | ✅ | ✅ |
| TypeScript-first | ✅ | ❌ | ❌ | ❌ |

## Quick Start

\`\`\`bash
npm install @taurus-ai/swarm-spawner
\`\`\`

\`\`\`typescript
import { SwarmSpawner } from "@taurus-ai/swarm-spawner";

const spawner = new SwarmSpawner({
  executor: async (agent, model) => {
    // Bring your own LLM
    return await yourLLM.generate(agent.task);
  },
});

const result = await spawner.spawn({
  tasks: [
    { id: "analyze", description: "Analyze this code for vulnerabilities", input: { code } },
    { id: "review",  description: "Review code style and patterns", input: { code } },
    { id: "test",    description: "Generate unit tests", input: { code } },
  ],
  strategy: "parallel",
});

console.log(`${result.successCount}/${result.totalAgents} agents completed`);
// Each agent got a PQC birth/death certificate
// Full lifecycle recorded on Hedera HCS
\`\`\`
```

---

## 13. Package Structure (Target)

```
@taurus-ai/swarm-spawner          ← Core SDK (npm)
├── src/
│   ├── index.ts                  ← Barrel export
│   ├── spawner.ts                ← SwarmSpawner + ModelExecutor
│   ├── model-router.ts           ← Tier-based model selection
│   ├── pqc-identity.ts           ← NEW: Birth/death certs, key derivation
│   ├── tier-enforcer.ts          ← NEW: Free/Pro/Enterprise gating
│   ├── hedera-integration.ts     ← Enhanced: topic-per-swarm, verification
│   └── result-aggregator.ts      ← Pass/fail aggregation
├── dist/                         ← Compiled JS + .d.ts
├── tests/
│   ├── spawner.test.ts           ← 13 tests (passing)
│   ├── pqc-identity.test.ts      ← NEW
│   ├── tier-enforcer.test.ts     ← NEW
│   └── lifecycle.test.ts         ← NEW: full integration
└── package.json

@taurus-ai/swarm-spawner-ai-sdk   ← AI SDK adapter (separate npm)
├── src/
│   └── index.ts                  ← createAISDKExecutor()
├── dist/
└── package.json
```

---

## 14. Implementation Priority

| Priority | Component | Effort | Dependency |
|----------|-----------|--------|------------|
| P0 | npm org creation (manual) | 5 min | Blocker for all publishes |
| P1 | PQCIdentityManager | 2-3 hours | @noble/post-quantum (already dep) |
| P2 | TierEnforcer | 1-2 hours | None |
| P3 | Hedera topic-per-swarm | 2-3 hours | Testnet account |
| P4 | AI SDK adapter package | 1-2 hours | Vercel AI SDK |
| P5 | README rewrite | 2-3 hours | All above working |
| P6 | Interactive demo | 3-4 hours | README, working SDK |
| P7 | License key system | 2-3 hours | Stripe integration |

**Total estimated: ~20 hours of focused work for v0.2.0**
