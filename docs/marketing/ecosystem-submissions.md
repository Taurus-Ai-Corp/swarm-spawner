# Ecosystem Submission Guide - Swarm Spawner

> **Project**: `@taurus-ai/swarm-spawner` - Ephemeral AI agent orchestration with PQC identity (ML-DSA-65) and Hedera blockchain audit trails
> **npm**: https://www.npmjs.com/package/@taurus-ai/swarm-spawner
> **GitHub**: https://github.com/Taurus-Ai-Corp/swarm-spawner
> **Playground**: https://taurus-ai-corp.github.io/swarm-spawner/
> **License**: MIT
> **Last Updated**: 2026-04-04

---

## Table of Contents

1. [Awesome Lists](#1-awesome-lists)
2. [VS Code Marketplace](#2-vs-code-marketplace)
3. [Hedera Ecosystem](#3-hedera-ecosystem)
4. [Newsletters & Media](#4-newsletters--media)
5. [Product Hunt & Hacker News](#5-product-hunt--hacker-news)
6. [Community & Content Platforms](#6-community--content-platforms)

---

## 1. Awesome Lists

### Standard PR Process (applies to all)

1. Fork the awesome list repository
2. Add entry in the correct section, maintaining **alphabetical order**
3. Open PR with descriptive title
4. Ensure your project meets the list's quality bar (stars, docs, tests, CI)
5. Be responsive to maintainer feedback

---

### 1a. awesome-hedera (HIGHEST PRIORITY)

- [x] **Repo**: https://github.com/hashgraph/awesome-hedera
- [ ] **Section**: `Developer Tools` (alongside Hedera CLI, Fee Tool, etc.)
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral AI agent orchestration with ML-DSA-65 quantum-safe identity and HCS audit trails.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - PQC-certified AI agent orchestration with HCS audit`
- [ ] **Notes**: This is the official Hedera awesome list maintained by the Hashgraph org. Maintain alphabetical order within the section. Read CONTRIBUTING.md before submitting. Strong fit because the project uses `@hashgraph/sdk` for HCS audit trails natively.

---

### 1b. awesome-agents (kyrolabs)

- [ ] **Repo**: https://github.com/kyrolabs/awesome-agents
- [ ] **Section**: `Agent Frameworks` (alongside ConnectOnion, OpenClaw, Hive, etc.)
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral AI agent orchestration with quantum-safe identity (ML-DSA-65), blockchain audit trails, and pluggable model executors. TypeScript-first. ![GitHub Repo stars](https://img.shields.io/github/stars/Taurus-Ai-Corp/swarm-spawner)
  ```
- [ ] **PR Title**: `Add Swarm Spawner - ephemeral PQC-certified AI agent framework`
- [ ] **Notes**: Active list with regular updates. Check if they use star badges (many entries do). Focus on what differentiates: ephemeral lifecycle, PQC identity, blockchain audit.

---

### 1c. awesome-ai-agents (e2b-dev)

- [ ] **Repo**: https://github.com/e2b-dev/awesome-ai-agents
- [ ] **Section**: This list focuses on AI agent products/apps. For SDKs/frameworks, they redirect to https://github.com/e2b-dev/awesome-ai-sdks
- [ ] **Submit to**: https://github.com/e2b-dev/awesome-ai-sdks instead
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral AI agent orchestration with PQC identity and Hedera audit trails. TypeScript SDK. Open source (MIT). [Playground](https://taurus-ai-corp.github.io/swarm-spawner/)
  ```
- [ ] **PR Title**: `Add Swarm Spawner - TypeScript SDK for ephemeral PQC-certified AI agents`

---

### 1d. awesome-llm-agents (kaushikb11)

- [ ] **Repo**: https://github.com/kaushikb11/awesome-llm-agents
- [ ] **Section**: Listed as curated LLM agent frameworks alongside CrewAI, Neurolink, etc.
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral AI agent framework with quantum-safe birth/death certificates (ML-DSA-65), pluggable model executors, and Hedera HCS audit trails.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - ephemeral agent framework with PQC identity`

---

### 1e. awesome-agent-orchestrators (andyrewlee)

- [ ] **Repo**: https://github.com/andyrewlee/awesome-agent-orchestrators
- [ ] **Section**: `Multi-Agent Frameworks` or `Agent SDKs & Developer Tools`
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - TypeScript SDK for ephemeral multi-agent orchestration with quantum-safe identity certificates and Hedera blockchain audit trails. Supports parallel/sequential/adaptive strategies.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - PQC-certified multi-agent orchestration SDK`

---

### 1f. awesome-multi-agent-systems (richardblythman)

- [ ] **Repo**: https://github.com/richardblythman/awesome-multi-agent-systems
- [ ] **Section**: `Frameworks` or `Libraries`
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral multi-agent orchestration with ML-DSA-65 quantum-safe identity, pluggable LLM executors, and Hedera HCS audit trails.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - ephemeral multi-agent framework with PQC + blockchain audit`

---

### 1g. awesome-cryptography (sobolevn)

- [ ] **Repo**: https://github.com/sobolevn/awesome-cryptography
- [ ] **Section**: `JavaScript` (libraries listed under language-specific sections)
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - AI agent orchestration SDK using ML-DSA-65 (FIPS 204) for quantum-safe birth/death certificates and identity management.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - ML-DSA-65 identity certificates for AI agents`
- [ ] **Notes**: Read https://github.com/sobolevn/awesome-cryptography/blob/master/CONTRIBUTING.md first. This list is well-maintained and strict about quality. Emphasize the cryptographic aspect (ML-DSA-65/FIPS 204), not the AI orchestration.

---

### 1h. awesome-post-quantum (veorq)

- [ ] **Repo**: https://github.com/veorq/awesome-post-quantum
- [ ] **Section**: `Software Projects` (alongside liboqs, PQClean, etc.)
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - TypeScript SDK using ML-DSA-65 for quantum-safe agent identity certificates. Built on @noble/post-quantum.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - ML-DSA-65 agent identity certificates (TypeScript)`
- [ ] **Notes**: This is the most authoritative PQC awesome list. Focus purely on the PQC angle.

---

### 1i. awesome-pqc (gauravfs-14)

- [ ] **Repo**: https://github.com/gauravfs-14/awesome-pqc
- [ ] **Section**: `Tools` or `Implementations`
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral AI agent SDK with ML-DSA-65 birth/death certificates. TypeScript, built on @noble/post-quantum.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - ML-DSA-65 identity management for AI agents`

---

### 1j. awesome-security (sbilly)

- [ ] **Repo**: https://github.com/sbilly/awesome-security
- [ ] **Section**: `Application Security` > `Tools`
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Quantum-safe AI agent orchestration with ML-DSA-65 identity certificates and immutable Hedera HCS audit trails. EU AI Act compliant.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - quantum-safe AI agent audit trail framework`

---

### 1k. awesome-nodejs (sindresorhus) - PAUSED

- [ ] **Repo**: https://github.com/sindresorhus/awesome-nodejs
- [ ] **Status**: **Submissions are paused until September 2026** due to spam. Bookmark and revisit.
- [ ] **Section**: Would be `Security` or `Mad Science`
- [ ] **Markdown line** (for when submissions reopen):
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral AI agent orchestration with quantum-safe identity and blockchain audit trails.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - PQC-certified ephemeral AI agents`

---

### 1l. awesome-typescript (dzharii) - ARCHIVED

- [ ] **Repo**: https://github.com/dzharii/awesome-typescript
- [ ] **Status**: **Archived in 2026**. Do not submit.
- [ ] **Alternatives**:
  - https://github.com/semlinker/awesome-typescript (still active)
  - https://github.com/lauris/awesome-typescript (community-driven)
- [ ] **Markdown line** (for active alternatives):
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral AI agent orchestration with quantum-safe ML-DSA-65 identity and Hedera blockchain audit trails.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - PQC-certified AI agent orchestration SDK`

---

### 1m. awesome-blockchain (yjjnls)

- [ ] **Repo**: https://github.com/yjjnls/awesome-blockchain
- [ ] **Section**: `Development and Applications` > `Tools`
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - AI agent orchestration with Hedera HCS audit trails and ML-DSA-65 identity. TypeScript SDK.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - AI agent orchestration with Hedera HCS audit trails`

---

### 1n. awesome-a2a-agents (isekOS)

- [ ] **Repo**: https://github.com/isekos/awesome-a2a-agents
- [ ] **Section**: Relevant if agent-to-agent communication patterns are highlighted
- [ ] **Markdown line**:
  ```
  - [Swarm Spawner](https://github.com/Taurus-Ai-Corp/swarm-spawner) - Ephemeral multi-agent orchestration with PQC-signed identity certificates and immutable audit trails.
  ```
- [ ] **PR Title**: `Add Swarm Spawner - PQC-certified ephemeral agent orchestration`

---

### Submission Priority Order

| Priority | List | Reason |
|----------|------|--------|
| 1 | awesome-hedera | Direct ecosystem fit, uses @hashgraph/sdk |
| 2 | awesome-agents (kyrolabs) | Most active AI agent list |
| 3 | awesome-post-quantum (veorq) | Authoritative PQC list |
| 4 | awesome-ai-sdks (e2b-dev) | High-visibility SDK list |
| 5 | awesome-llm-agents | Framework-focused |
| 6 | awesome-agent-orchestrators | Orchestration-specific |
| 7 | awesome-cryptography | Broad crypto audience |
| 8 | awesome-pqc | PQC niche |
| 9 | awesome-multi-agent-systems | Multi-agent niche |
| 10 | awesome-security | Security audience |
| 11 | awesome-blockchain | Blockchain angle |
| 12 | awesome-typescript (alternatives) | TypeScript audience |
| 13 | awesome-nodejs | Paused until September |

---

## 2. VS Code Marketplace

### Extension Concept: "Swarm Spawner: PQC Agent Inspector"

A VS Code extension that provides developer tooling for monitoring and debugging swarm-spawner agent lifecycles, inspecting PQC certificates, and viewing Hedera audit trails.

**This is a FUTURE task. The plan below documents the approach for when we are ready to build it.**

---

### 2a. What the Extension Would Show

- **Agent Lifecycle Panel**: Real-time view of agent spawn events showing the full lifecycle (ENFORCE -> ROUTE -> CERTIFY BIRTH -> EXECUTE -> CERTIFY DEATH -> AUDIT -> DIE)
- **Certificate Inspector**: Decode and display ML-DSA-65 birth/death certificates with signature verification status, showing agent ID, task description, model tier, timestamps, and signature validity
- **Hedera Audit Trail Viewer**: Browse HCS messages for a given topic ID, showing timestamped audit events with links to HashScan explorer
- **Swarm Dashboard**: Overview of all active/completed swarms with success rates, durations, and cost estimates
- **Code Lens**: Inline annotations above `spawner.spawn()` calls showing last execution results

---

### 2b. Scaffolding Steps

```bash
# Install prerequisites
npm install -g yo generator-code

# Scaffold the extension
yo code

# Select options:
#   Type: New Extension (TypeScript)
#   Name: swarm-spawner-inspector
#   Identifier: swarm-spawner-inspector
#   Description: PQC Agent Lifecycle Inspector for Swarm Spawner
#   Bundle: webpack
#   Package manager: npm

# Alternative (no global install):
npx --package yo --package generator-code -- yo code
```

**Generator repo**: https://github.com/microsoft/vscode-generator-code
**npm package**: https://www.npmjs.com/package/generator-code
**VS Code Extension API docs**: https://code.visualstudio.com/api/get-started/your-first-extension

---

### 2c. Extension Architecture Plan

```
swarm-spawner-inspector/
  src/
    extension.ts          # Activation, command registration
    panels/
      lifecycle.ts        # WebviewPanel for agent lifecycle
      certificate.ts      # WebviewPanel for PQC cert inspection
      audit-trail.ts      # WebviewPanel for Hedera HCS viewer
    providers/
      tree-data.ts        # TreeDataProvider for sidebar
      code-lens.ts        # CodeLensProvider for spawn() annotations
    utils/
      pqc-verify.ts       # ML-DSA-65 signature verification
      hedera-client.ts    # HCS topic message fetcher
  package.json            # contributes: viewsContainers, commands, menus
  media/                  # Icons, CSS for webviews
```

---

### 2d. Publish Checklist (When Ready)

- [ ] Create publisher account at https://marketplace.visualstudio.com/manage
- [ ] Install vsce: `npm install -g @vscode/vsce`
- [ ] Package: `vsce package`
- [ ] Publish: `vsce publish`
- [ ] Add marketplace badges to main swarm-spawner README
- [ ] Submit to https://open-vsx.org/ for Open VSX Registry (VS Codium users)

---

## 3. Hedera Ecosystem

### 3a. HBAR Foundation / Hedera Foundation Grant

- [ ] **Application URL**: https://hbarfoundation.org/apply-form
- [ ] **Alternative**: https://hedera.com/grants (Hedera grants & accelerators page)
- [ ] **What to include in application**:
  - Tangible business goals (EU AI Act compliance tooling for enterprises)
  - Revenue model (Free tier + Pro/Enterprise license keys)
  - Architecture diagrams (spawn lifecycle, HCS integration)
  - Competitor analysis (vs CrewAI, LangGraph, AutoGen -- none have PQC or blockchain audit)
  - Development milestones (8-week launch plan already written)
  - Network utilization projections (HCS messages per agent lifecycle)
  - Developer community KPIs (npm downloads, GitHub stars, playground usage)
- [ ] **Grant focus areas**: Developer Tooling, DeFi/Fintech, Enterprise
- [ ] **Key differentiator**: Swarm Spawner creates HCS messages on every agent lifecycle event, driving real network utilization

---

### 3b. Hello Future Hackathon Series

- [ ] **Current**: Hello Future Apex Hackathon 2026
- [ ] **URL**: https://hellofuturehackathon.dev/
- [ ] **Also on**: https://hackathon.stackup.dev/web/events/hedera-hello-future-apex-hackathon-2026
- [ ] **Prize Pool**: $250K (Apex) / $550K total trilogy
- [ ] **Relevant Tracks**:
  - "AI agents using Hedera tools like Eliza, Agent Kit, and OpenConvAI" -- **perfect fit**
  - "Hardware and edge developers building secure, coordinated systems on Hedera"
- [ ] **Action**: Submit swarm-spawner as a hackathon project or build a demo app on top of it

---

### 3c. Hedera Builders Program

- [ ] **URL**: https://hedera.com/builders-program/
- [ ] **What you get**: Community Builder NFTs (Starter, Explorer), token-gated developer channels, networking
- [ ] **Action**: Enroll, complete developer courses, earn NFTs, get access to builder-only channels

---

### 3d. Hedera Thrive

- [ ] **URL**: https://hedera.thrive.xyz/
- [ ] **What**: Builder community platform for Hedera projects
- [ ] **Action**: Create a project listing for Swarm Spawner

---

### 3e. awesome-hedera PR

(Covered in Section 1a above)

---

### 3f. Hedera Community Channels

- [ ] **Discord**: https://discord.com/invite/hederahashgraph (or https://hedera.com/discord)
  - Share in `#developer` or `#showcase` channels
  - Post an introduction of the project with playground link
- [ ] **Twitter/X Accounts to tag/engage**:
  - `@hedera` -- Main account
  - `@hedera_devs` -- Developer-focused account
  - `@HederaFndn` -- Hedera Foundation
  - `@hashgraph` -- Hashgraph
- [ ] **Hashtags**: `#hedera` `#hederahashgraph` `#buildonhedera` `#blockchain` `#AI` `#PQC`
- [ ] **Hedera Blog**: Pitch a guest post to the Hedera team about "Building EU AI Act Compliant Agent Systems on Hedera"
  - Contact via Discord or developer relations

---

### 3g. GitHub Discoverability

- [ ] Add `hedera` topic to the swarm-spawner GitHub repo (Settings > About > Topics)
- [ ] Also add: `hashgraph`, `hcs`, `post-quantum-cryptography`, `ai-agents`, `ml-dsa-65`
- [ ] This makes the repo appear at https://github.com/topics/hedera

---

### 3h. Electric Capital Developer Report

- [ ] **Info**: https://hedera.com/blog/capture-your-contributions-to-the-hedera-ecosystem-in-the-electric-capital-developer-report/
- [ ] **Action**: Submit an Airtable form (linked from blog post) to get Taurus-Ai-Corp/swarm-spawner counted in the Electric Capital ecosystem report for Hedera
- [ ] **Why**: This report is tracked by VCs and ecosystem analysts. Having commits counted adds credibility.

---

## 4. Newsletters & Media

### 4a. TypeScript / JavaScript Newsletters

| Newsletter | URL | Submit via | Audience |
|------------|-----|-----------|----------|
| [ ] TypeScript Weekly | https://typescript-weekly.com/ | Contact form on site or reply to newsletter | TypeScript devs |
| [ ] JavaScript Weekly | https://javascriptweekly.com/ | Email editorial suggestions via site | 170K+ JS devs |
| [ ] Node Weekly | https://nodeweekly.com/ | Email editorial suggestions via site | Node.js devs |
| [ ] Bytes.dev | https://bytes.dev/ | Contact via site | JS/TS community |

**Pitch angle for TS/JS newsletters**: "First TypeScript SDK for AI agents with NIST FIPS 204 quantum-safe signatures. Bring your own LLM, get tamper-proof audit trails."

---

### 4b. AI / ML Newsletters

| Newsletter | URL | Submit via | Audience |
|------------|-----|-----------|----------|
| [ ] TLDR AI | https://tldr.tech/ai | No direct submission -- pitch via X (@TLDRTech1) or email | AI/ML practitioners |
| [ ] TLDR Web Dev | https://tldr.tech/webdev | Same as above | Web devs |
| [ ] The Batch (Andrew Ng) | https://www.deeplearning.ai/the-batch/ | Email pitch | AI industry |
| [ ] AI Weekly | https://aiweekly.co/ | Contact via site | AI practitioners |

**Pitch angle for AI newsletters**: "Every AI agent framework lets you spawn agents. None gives them a cryptographic identity and immutable audit trail. Swarm Spawner does -- with quantum-safe ML-DSA-65 signatures."

---

### 4c. Security / Cryptography Newsletters

| Newsletter | URL | Submit via | Audience |
|------------|-----|-----------|----------|
| [ ] tl;dr sec | https://tldrsec.com/ | DM @clintgibler on X or contact via site | 90K+ security pros |
| [ ] TLDR InfoSec | https://tldr.tech/infosec | Same as TLDR | InfoSec community |
| [ ] Crypto-Gram (Schneier) | https://www.schneier.com/crypto-gram/ | Not accepting submissions -- hope for organic coverage | Crypto experts |

**Pitch angle for security newsletters**: "ML-DSA-65 (FIPS 204) signed birth/death certificates for AI agents. Immutable Hedera HCS audit trails. Built for EU AI Act compliance (August 2, 2026 deadline)."

---

### 4d. Developer Tools Newsletters

| Newsletter | URL | Submit via | Audience |
|------------|-----|-----------|----------|
| [ ] Console.dev | https://console.dev/ | Email hello@console.dev with project details | Experienced devs, CTOs |
| [ ] DevOps Weekly | https://www.devopsweekly.com/ | Submit via site | DevOps engineers |
| [ ] Changelog | https://changelog.com/ | Submit news at https://changelog.com/news/submit | Open source devs |

**Pitch angle for dev tools newsletters**: "Open-source TypeScript SDK for ephemeral AI agents. Spawn, certify with quantum-safe crypto, execute, audit on blockchain, die. Try the browser playground."

---

## 5. Product Hunt & Hacker News

### 5a. Product Hunt Launch Strategy

- [ ] **Launch URL**: https://www.producthunt.com/launch
- [ ] **Category**: https://www.producthunt.com/topics/developer-tools
- [ ] **Also tag**: https://www.producthunt.com/topics/open-source

#### Pre-Launch Checklist (4-6 weeks before)

- [ ] Create maker account on Product Hunt
- [ ] Build a "Coming Soon" page on Product Hunt
- [ ] Prepare 5+ high-quality screenshots/GIFs:
  - Playground in action (agent spawning)
  - Certificate inspector showing ML-DSA-65 signature
  - Code example (spawn call)
  - Comparison table vs CrewAI/LangGraph/AutoGen
  - Architecture diagram (lifecycle flow)
- [ ] Write tagline (60 chars max, no emojis): `TypeScript SDK for quantum-safe AI agent orchestration`
- [ ] Write description (500 chars max):
  ```
  Swarm Spawner gives every AI agent a quantum-safe identity (ML-DSA-65),
  an immutable audit trail (Hedera HCS), and a full lifecycle: spawn, certify,
  execute, sign, audit, die. Bring your own LLM. TypeScript-first. MIT licensed.
  Built for the EU AI Act deadline (Aug 2, 2026). Try the browser playground --
  no signup, no API keys.
  ```
- [ ] Line up 20-30 supporters to leave genuine comments on launch day
- [ ] Prepare a launch-day blog post with technical deep dive

#### Launch Day

- [ ] Launch at **12:01 AM Pacific Time** on a **Tuesday, Wednesday, or Thursday**
- [ ] Post on X/Twitter immediately after with playground link
- [ ] Share in Hedera Discord, relevant Slack communities
- [ ] Respond to every comment within 30 minutes
- [ ] Cross-post launch announcement to dev.to, Reddit r/typescript, r/opensource

#### Post-Launch

- [ ] Send thank you to commenters
- [ ] Write "lessons learned" blog post
- [ ] Update README with Product Hunt badge

---

### 5b. Hacker News Launch Strategy

- [ ] **Show HN URL**: https://news.ycombinator.com/submit
- [ ] **Launch HN (if YC-affiliated)**: https://news.ycombinator.com/launches

#### Title Format

```
Show HN: Swarm Spawner -- Quantum-safe identity for ephemeral AI agents (TypeScript)
```

#### Post Body

```
I built an open-source TypeScript SDK that gives every AI agent a quantum-safe
identity certificate (ML-DSA-65 / FIPS 204) and an immutable audit trail on
Hedera HCS.

The lifecycle: ENFORCE tier -> ROUTE model -> CERTIFY BIRTH -> EXECUTE -> CERTIFY DEATH -> AUDIT -> DIE

No other agent framework (CrewAI, LangGraph, AutoGen) has cryptographic identity
or blockchain audit. Built for the EU AI Act deadline (Aug 2026).

Try it in the browser: https://taurus-ai-corp.github.io/swarm-spawner/
GitHub: https://github.com/Taurus-Ai-Corp/swarm-spawner
npm: npm install @taurus-ai/swarm-spawner
```

#### Timing & Strategy

- [ ] Post on **Tuesday or Wednesday, 8-9 AM ET** (US morning, EU afternoon)
- [ ] Do NOT ask for upvotes (HN bans this)
- [ ] Be ready to answer technical questions for 4-6 hours
- [ ] Focus on technical novelty, not marketing language
- [ ] HN audience loves: open source, cryptography, novel approaches, EU regulation compliance

---

## 6. Community & Content Platforms

### 6a. Blog Posts / Articles

| Platform | URL | Action |
|----------|-----|--------|
| [ ] DEV Community | https://dev.to/ | Publish article: "How I Built Quantum-Safe AI Agent Identity with ML-DSA-65" |
| [ ] Hashnode | https://hashnode.com/ | Cross-post the dev.to article |
| [ ] Medium / Hedera Blog | https://medium.com/hedera | Pitch guest post about HCS integration |

**Article ideas**:
1. "Why Your AI Agents Need a Birth Certificate (and a Death Certificate)"
2. "Building EU AI Act Compliant Agent Systems with Hedera HCS"
3. "ML-DSA-65 in Practice: Quantum-Safe Identity for Ephemeral AI Agents"
4. "Swarm Spawner vs CrewAI vs LangGraph: The Missing Security Layer"

---

### 6b. Reddit

| Subreddit | URL | Post type |
|-----------|-----|-----------|
| [ ] r/typescript | https://reddit.com/r/typescript | Show-off post with playground link |
| [ ] r/opensource | https://reddit.com/r/opensource | Project announcement |
| [ ] r/hedera | https://reddit.com/r/hedera | Ecosystem project showcase |
| [ ] r/cryptography | https://reddit.com/r/cryptography | Technical post about ML-DSA-65 usage |
| [ ] r/artificial | https://reddit.com/r/artificial | AI agent framework announcement |
| [ ] r/MachineLearning | https://reddit.com/r/MachineLearning | [P] tag project post |

---

### 6c. npm "Made With" Collections

- [ ] Ensure keywords in `package.json` are comprehensive: `ai`, `agents`, `orchestration`, `ephemeral`, `swarm`, `hedera`, `blockchain`, `post-quantum`, `pqc`, `ml-dsa-65`, `cryptography`, `audit-trail`, `eu-ai-act`
- [ ] Add to npm "Collections" if available
- [ ] npm homepage link points to playground
- [ ] Add `funding` field to package.json (if applicable):
  ```json
  "funding": {
    "type": "github",
    "url": "https://github.com/sponsors/Taurus-Ai-Corp"
  }
  ```

---

### 6d. GitHub Discoverability

- [ ] Add comprehensive GitHub Topics to the repo:
  - `ai-agents`, `typescript`, `post-quantum-cryptography`, `ml-dsa-65`, `hedera`, `blockchain`, `audit-trail`, `ephemeral-agents`, `agent-framework`, `cryptography`, `eu-ai-act`, `pqc`, `swarm`, `orchestration`, `hashgraph`
- [ ] Ensure `demo.gif` is high quality in README
- [ ] Add "Used By" section to README when early adopters appear
- [ ] Create GitHub Discussions for community Q&A

---

### 6e. Other Platforms

| Platform | URL | Action |
|----------|-----|--------|
| [ ] LibHunt | https://www.libhunt.com/ | Auto-indexed from awesome lists. Submitting to awesome lists handles this. |
| [ ] AlternativeTo | https://alternativeto.net/ | Submit as alternative to CrewAI, LangGraph |
| [ ] StackShare | https://stackshare.io/ | Create tool listing |
| [ ] OpenBase | https://openbase.com/ | Auto-indexed from npm |

---

## Execution Timeline

| Week | Actions |
|------|---------|
| **Week 1** | Submit PRs to awesome-hedera, awesome-agents (kyrolabs), awesome-post-quantum (veorq) |
| **Week 1** | Add GitHub topics, join Hedera Discord, post in #developer |
| **Week 2** | Submit PRs to awesome-ai-sdks (e2b), awesome-llm-agents, awesome-cryptography |
| **Week 2** | Publish dev.to article, pitch to TypeScript Weekly and Console.dev |
| **Week 3** | Submit HBAR Foundation grant application |
| **Week 3** | Submit PRs to remaining awesome lists |
| **Week 4** | Hacker News "Show HN" launch |
| **Week 5** | Product Hunt launch (Tuesday/Wednesday) |
| **Week 5** | Pitch to tl;dr sec, TLDR AI, Node Weekly |
| **Week 6** | Reddit posts across relevant subreddits |
| **Week 6** | Apply to Hello Future Apex Hackathon if timing aligns |

---

## Tracking

Use this section to track submissions and their outcomes:

| Submission | Date | Status | URL | Notes |
|------------|------|--------|-----|-------|
| awesome-hedera PR | | Pending | | |
| awesome-agents PR | | Pending | | |
| awesome-post-quantum PR | | Pending | | |
| awesome-ai-sdks PR | | Pending | | |
| awesome-llm-agents PR | | Pending | | |
| awesome-cryptography PR | | Pending | | |
| HBAR Foundation grant | | Pending | | |
| Hedera Discord intro | | Pending | | |
| dev.to article | | Pending | | |
| Hacker News Show HN | | Pending | | |
| Product Hunt launch | | Pending | | |
| TypeScript Weekly pitch | | Pending | | |
| Console.dev pitch | | Pending | | |
| tl;dr sec pitch | | Pending | | |
