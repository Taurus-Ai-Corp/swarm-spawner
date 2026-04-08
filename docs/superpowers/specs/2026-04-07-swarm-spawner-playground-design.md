# Swarm Spawner Playground — Design Spec

> Single-file HTML playground that lets enterprises try real PQC agent spawning in-browser.

## Purpose

Interactive demo for swarm-spawner SDK. Two audiences:
- **Enterprise buyers** (CTOs/CISOs): see the PQC lifecycle, understand what they're buying
- **Developers**: configure a spawn, watch it run, copy working TypeScript

## Decisions

| Aspect | Choice |
|--------|--------|
| Audience | Hybrid — buyer + developer |
| Layout | Stacked Hero: header → controls+animation → code output |
| Visual style | Cyberpunk Terminal — #0a0a0f dark, neon green/purple/amber, monospace |
| Interaction | Choreographed ~4s animation + timeline scrubber for replay/inspection |
| Controls | All 8 configs exposed + 4 presets |
| PQC crypto | **Real** — @noble/post-quantum bundled inline as IIFE (21KB) |
| Code output | Live TypeScript generation, syntax highlighted, copy button |
| Dependencies | **Zero** — fully self-contained single HTML file |

## Architecture

### File Structure

Single file: `playground.html` (~2000-2500 lines estimated)

Sections:
1. Inlined `<script>` — Noble PQC bundle (21KB IIFE, exposes `Noble.ml_dsa65`, `Noble.sha256`, `Noble.bytesToHex`)
2. Inlined `<style>` — all CSS (cyberpunk theme, animations, layout)
3. HTML structure — header, controls panel, animation stage, code output
4. Inlined `<script>` — application logic (state, animation engine, code generator)

### Noble PQC Bundle

Built from swarm-spawner's own `node_modules/`:

```bash
NODE_PATH=./node_modules npx esbuild entry.js --bundle --format=iife --global-name=Noble --minify --outfile=noble-bundle.js --platform=browser
```

Entry:
```js
export { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
export { sha256 } from "@noble/hashes/sha2.js";
export { bytesToHex } from "@noble/hashes/utils.js";
```

Verified: keygen→1952/4032B, sign→3309B, verify→true.

### What Runs for Real

- `ml_dsa65.keygen(seed)` — deterministic per-agent key derivation (masterSeed + SHA-256)
- `ml_dsa65.sign(message, secretKey)` — birth/death certificate signing
- `ml_dsa65.verify(signature, message, publicKey)` — live verification in certificate inspector
- `sha256()` — result hashing for death certificates
- `bytesToHex()` — hex display of signatures and keys

### What Is Simulated

- **Hedera HCS** — requires network/API keys. Show mock topic IDs and sequence numbers.
- **Model execution** — no LLM calls. Executor returns `{ agentId, result: "Processed: <task>" }` after a randomized delay (200-800ms).
- **Agent IDs** — generated with `crypto.randomUUID()` (real browser API).
- **Failure simulation** — one random agent per spawn fails (demonstrates error handling).

## Layout

### 1. Header Bar

```
┌──────────────────────────────────────────────────────────┐
│  ⬡ SWARM SPAWNER v0.3.1     Free│Pro│Enterprise   [SPAWN]│
└──────────────────────────────────────────────────────────┘
```

- Logo: hex icon + monospace title, neon green, letter-spacing: 3px
- Tier selector: 3 pill buttons. Active tier has neon glow matching tier color:
  - Free = green (#00ffa3)
  - Pro = purple (#a78bfa)
  - Enterprise = amber (#f59e0b)
- Changing tier instantly updates: locked controls, code output, tier color accents
- SPAWN button: large, pulsing neon border, disabled until ≥1 task configured

### 2. Controls Panel (Left, ~280px)

8 controls + 4 presets:

**Presets** (snap all controls):
- Quick Demo: 3 tasks, parallel, fast, free tier
- PQC Showcase: 5 tasks, parallel, balanced, pro tier, PQC on
- Stress Test: 20 tasks, parallel, fast, timeout 5s
- Enterprise: 10 tasks, adaptive, deep, PQC on, mainnet, enterprise tier

**Controls:**
| Control | Type | Range | Default |
|---------|------|-------|---------|
| Tasks | Slider | 1-20 | 5 |
| Strategy | Radio | parallel/sequential/adaptive | parallel |
| Model Tier | Radio | fast/balanced/deep | fast |
| PQC Identity | Toggle | on/off | off |
| Hedera Audit | Toggle | on/off | on |
| Max Parallel | Slider | 1-10 | 5 |
| Timeout | Slider | 5-120s | 30s |
| Network | Radio | testnet/mainnet | testnet |

**Tier gating:** Controls unavailable on current tier are visible but grayed with a 🔒 icon. Clicking shows tooltip: "Upgrade to Pro — $49/mo". Gating rules:
- Free: only fast model tier, no PQC, testnet only, max 5 agents
- Pro: all model tiers, PQC enabled, testnet+mainnet, unlimited agents
- Enterprise: same as Pro + custom maxAgents

### 3. Animation Stage (Main Area)

**Initial state:** Centered text "Click SPAWN to begin" with config summary.

**Choreographed sequence (~4 seconds):**

| Time | Phase | Visual |
|------|-------|--------|
| 0-0.5s | ENFORCE | Tier badge flashes, green checkmark animates in |
| 0.5-1.5s | ROUTE + CERTIFY BIRTH | Agent circles spawn from center with ripple. Each gets colored ring (green/purple/amber by model tier). Birth cert icon (🔏) pulses if PQC on. Model label fades in below each. |
| 1.5-2.5s | EXECUTE | Agents pulse while "running". Progress ring fills around each. One random agent fails (red flash). |
| 2.5-3.5s | CERTIFY DEATH + AUDIT | Completed = green glow, failed = red. Death cert icon appears. Hedera audit line animates if enabled. |
| 3.5-4s | DIE | Agents fade with dissolve. Summary stats: "4/5 completed · 247ms avg · 2 certs issued" |

**Agent node design:** 48px circles with 2px colored border. Agent number centered. During execution, a conic-gradient progress ring fills clockwise.

**After sequence — Timeline Scrubber:**
- Horizontal range input snapping to 6 labeled points: ENFORCE / ROUTE / BIRTH / EXECUTE / DEATH / AUDIT
- Dragging replays animation to that point (state is frozen)
- Click any agent circle to inspect individual journey

**Certificate Inspector** (expandable panel below scrubber):
- Appears when scrubber is on BIRTH or DEATH, or when an agent is clicked
- Shows real data:
  - Type: birth/death
  - Agent ID
  - Algorithm: ML-DSA-65 (FIPS 204)
  - Signature: hex (truncated with expand, full 3309 bytes)
  - Public Key: hex (truncated, full 1952 bytes)
  - Payload: JSON
  - [Verify] button → runs `ml_dsa65.verify()` live → shows ✓ Valid / ✗ Invalid

### 4. Code Output Panel (Bottom)

- Dark code block with faint neon border glow matching tier color
- Syntax highlighting via CSS classes (no library):
  - Keywords (const, await, import, from) → neon green
  - Strings → amber
  - Comments → dim gray (#555)
  - Types → purple
- Live updates on every control change
- Only includes non-default config values (clean output)
- Shows `pqcIdentity` block only when PQC is on
- When tier is free and PQC-locked features are relevant, adds comment: `// Upgrade to Pro for PQC identity`
- Copy button with "Copied!" flash
- Install line: `npm i @taurus-ai/swarm-spawner` with its own copy button

### Code Template

```typescript
import { SwarmSpawner } from "@taurus-ai/swarm-spawner";

const spawner = new SwarmSpawner({
  // Only non-default values shown
  maxParallel: 5,
  timeout: 30000,
  enableAuditTrail: true,
  hederaNetwork: "testnet",
  pqcIdentity: {
    masterSeed: crypto.getRandomValues(new Uint8Array(32)),
  },
});

const result = await spawner.spawn({
  tasks: [
    { id: "task-1", description: "Analyze data",
      input: { source: "api" }, modelTier: "fast" },
    // ... N more tasks
  ],
  strategy: "parallel",
});

console.log(result);
// { total: 5, passed: 4, failed: 1, duration: 1247 }
```

## State Management

Single state object, every control writes to it, every render reads from it:

```javascript
const DEFAULTS = {
  tasks: 5, strategy: 'parallel', modelTier: 'fast',
  tier: 'free', pqc: false, audit: true,
  maxParallel: 5, timeout: 30, network: 'testnet'
};

const state = { ...DEFAULTS };
// + animation state: phase, progress, agents[], certs[], scrubberPosition
```

`updateAll()` called on every control change → re-renders code panel + updates locked states.

## CSS Theme

```css
:root {
  --bg: #0a0a0f;
  --bg-card: #111118;
  --bg-input: #16161e;
  --border: #1e1e2a;
  --text: #c8c8d0;
  --text-dim: #555566;
  --neon-green: #00ffa3;
  --neon-purple: #a78bfa;
  --neon-amber: #f59e0b;
  --neon-red: #ef4444;
  --font-mono: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
}
```

Neon glow effect: `box-shadow: 0 0 12px var(--neon-green), 0 0 24px rgba(0,255,163,0.15);`

## Performance Constraints

- Animation: CSS transitions + requestAnimationFrame only, no animation libraries
- PQC keygen is ~50-100ms per agent — run in sequence, not blocking UI (use setTimeout batching)
- Total page weight target: <100KB (21KB noble + ~30KB CSS + ~40KB JS + ~5KB HTML)

## Out of Scope

- Mobile responsive layout (desktop-first enterprise tool)
- Auth / signup forms
- Actual Hedera network calls
- Actual LLM execution
- Backend of any kind
