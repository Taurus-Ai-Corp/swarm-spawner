# Swarm Spawner

Ephemeral AI agent orchestration system with Hedera blockchain auditability.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-TS%20%7C%20Python%20%7C%20Rust%20%7C%20Go-lightgrey)

## Overview

Swarm Spawner spawns short-lived specialized agents for single tasks. Each agent gets a model matched to its specific subtask with no persistent state.

## Features

- **Ephemeral Agents** - Stateless, disposable agents that die after task completion
- **Model Router** - Fast/Balanced/Deep tier selection across 9+ models
- **Hedera Integration** - HCS audit trails, PQC signing (ML-KEM-768), HTS credentials
- **Multi-language SDK** - TypeScript, Python, Rust, Go
- **IDE Integrations** - Claude Code, Cursor, VS Code plugins

## Installation

```bash
# TypeScript
npm install swarm-spawner

# Python
pip install swarm-spawner

# Go
go get github.com/taurus-ai/swarm-spawner

# Rust
cargo add swarm-spawner
```

## Quick Start

```typescript
import { SwarmSpawner } from 'swarm-spawner';

const spawner = new SwarmSpawner({ maxParallel: 5 });

const result = await spawner.spawn({
  tasks: [
    { id: 'task-1', description: 'Analyze code', input: {}, modelTier: 'balanced' },
    { id: 'task-2', description: 'Generate tests', input: {}, modelTier: 'fast' },
  ],
  strategy: 'parallel',
});

console.log(`Success rate: ${result.successRate * 100}%`);
```

## Python

```python
from swarm_spawner import SwarmSpawner, SwarmConfig, SpawnRequest, SpawnTask, ModelTier

spawner = SwarmSpawner(SwarmConfig(max_parallel=5))

request = SpawnRequest(
    tasks=[
        SpawnTask(id="task-1", description="Analyze code", input={}, model_tier=ModelTier.BALANCED),
        SpawnTask(id="task-2", description="Generate tests", input={}, model_tier=ModelTier.FAST),
    ],
    strategy="parallel"
)

result = await spawner.spawn(request)
print(f"Success rate: {result['successRate'] * 100}%")
```

## Go

```go
spawner := NewSwarmSpawner(&SwarmConfig{
    MaxParallel: 5,
})

result, _ := spawner.Spawn(SpawnRequest{
    Tasks: []SpawnTask{
        {ID: "task-1", Description: "Analyze code", ModelTier: ModelTierBalanced},
        {ID: "task-2", Description: "Generate tests", ModelTier: ModelTierFast},
    },
    Strategy: "parallel",
})

fmt.Printf("Success rate: %.1f%%\n", result.SuccessRate*100)
```

## Model Selection

| Tier | Use Case | Providers |
|------|----------|-----------|
| **Fast** | Simple tasks, checks, listings | Groq Llama, Ollama Qwen, Gemini Flash |
| **Balanced** | Standard development tasks | Claude Haiku, GPT-4o Mini, Gemini Pro |
| **Deep** | Complex refactoring, architecture | Claude Sonnet, GPT-4 Turbo, DeepSeek Coder |

## Hedera Blockchain Integration

```typescript
const spawner = new SwarmSpawner({
  enableAuditTrail: true,
  hederaNetwork: 'testnet',
  pqcKeyPair: {
    publicKey: process.env.PQC_PUBLIC_KEY!,
    privateKey: process.env.PQC_PRIVATE_KEY!,
  },
});

// Audit trail automatically logs to Hedera HCS
const result = await spawner.spawn({ /* tasks */ });
```

### Environment Variables

```bash
# Hedera Operator (testnet)
export HEDERA_OPERATOR_ID=0.0.12345
export HEDERA_OPERATOR_KEY=302...

# Hedera Operator (mainnet)
export HEDERA_MAINNET_OPERATOR_ID=0.0.12345
export HEDERA_MAINNET_OPERATOR_KEY=302...

# Post-Quantum Keys
export PQC_PUBLIC_KEY=...
export PQC_PRIVATE_KEY=...
```

## IDE Integrations

### Claude Code

```typescript
import { createSwarmHook } from 'swarm-spawner/hedera';

const hook = createSwarmHook({ maxAgents: 5 });
await hook.executeSwarmCommand('analyze and refactor', { target: 'src/' });
```

### Cursor

```typescript
import { createCursorHook } from 'swarm-spawner/cursor';

const hook = createCursorHook();
await hook.executeSwarmCommand('refactor and test', ['file1.ts', 'file2.ts']);
```

### VS Code

1. Open VS Code Extensions panel
2. Search for "Swarm Spawner"
3. Install and configure in settings

## Architecture

```
┌─────────────────────────────────────────────┐
│            Swarm Spawner                     │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │   Model     │  │   Hedera Integration │  │
│  │   Router    │  │  - HCS Audit Trails  │  │
│  │ (Tier-based)│  │  - PQC Signing       │  │
│  └─────────────┘  │  - HTS Credentials    │  │
│                   └──────────────────────┘  │
│  ┌────────────────────────────────────────┐ │
│  │       Ephemeral Agent Engine            │ │
│  │  - Parallel/Sequential execution       │ │
│  │  - Timeout handling                    │ │
│  │  - Result aggregation                  │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Monetization (Open Core + Services)

| Tier | Price | Features |
|------|-------|----------|
| **Community** | Free | Core SDK, 5 agents, testnet |
| **Professional** | $49/mo | Unlimited agents, mainnet, PQC |
| **Enterprise** | Custom | Full audit trail, support, SLA |

## Compliance

- **EU AI Act**: Risk assessment for agent decision-making
- **NYC Local Law 144**: Bias audit for employment agents
- **Export Controls**: Encryption classification for PQC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit with conventional commits
4. Submit a PR

## License

MIT License - See LICENSE file for details.

---

*Powered by Hedera Hashgraph | Post-Quantum Ready*