# Swarm Spawner — 8-Week Launch Plan

> Approach C: Crypto-AI Convergence Protocol
> Start: 2026-04-03 | Launch: 2026-05-29
> Team: 1 person (~4 hours/day = 20 hrs/week = 160 hrs total)
> Budget: $0 marketing

---

## Success Metrics (End of Week 8)

| Metric | Target | Stretch |
|--------|--------|---------|
| GitHub Stars | 1,000 | 3,000 |
| npm weekly downloads | 500 | 2,000 |
| Pro subscribers ($49/mo) | 5 | 15 |
| Enterprise leads | 2 | 5 |
| HN front page | 1 post | 2 posts |
| Revenue (MRR) | $245 | $735 |

---

## Week 1 (Apr 3-9): Fix & Ship v0.2.0

**Goal**: Working package that doesn't embarrass you

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| Create npm org `taurus-ai` | 0.5 | npmjs.com/org/taurus-ai exists |
| Bump to v0.2.0 with changelog | 0.5 | CHANGELOG.md documents breaking changes |
| Publish `@taurus-ai/swarm-spawner@0.2.0` | 0.5 | `npm install @taurus-ai/swarm-spawner` works |
| Deprecate `swarm-spawner@0.1.0` | 0.5 | Warning shown on install |
| Implement PQCIdentityManager | 4 | Birth/death certs with ML-DSA-65, 5+ tests |
| Implement TierEnforcer | 2 | Free tier limits enforced, 4+ tests |
| Port PQC from @taurus/pqc-crypto | 2 | Real ML-DSA-65 replaces stubs |
| Update package.json exports | 1 | `./hedera` and `./pqc` sub-exports work |
| Build passes, 25+ tests pass | 1 | `npm run build && npm test` clean |

**Hours: ~12 / 20 available**

**Dependencies**: npm org creation (manual, blocker)
**Risk**: @noble/post-quantum bundle size — mitigate with optional peer dep

---

## Week 2 (Apr 10-16): README & Demo

**Goal**: Someone landing on the repo understands the value in 10 seconds

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| README rewrite (hero section) | 2 | One-liner pitch, comparison table, quickstart |
| Terminal demo GIF | 2 | 30-second GIF showing spawn→certify→execute→audit |
| `npx @taurus-ai/swarm-spawner init` CLI | 4 | Scaffolds config + example in <60 seconds |
| 3 example use cases | 4 | code-review-swarm, research-swarm, compliance-scan |
| Architecture diagram (ASCII in README) | 1 | Shows lifecycle + components |
| GitHub repo polish | 2 | Topics, description, social preview image, About |
| Add CONTRIBUTING.md | 1 | Clear contribution guide |

**Hours: ~16 / 20 available**

**Key**: The README IS the landing page. Every starred repo has:
1. Hero image/GIF above the fold
2. Comparison table vs competitors
3. One-command install
4. 10-line working example
5. "Why this exists" section that creates urgency

---

## Week 3 (Apr 17-23): AI SDK Adapter + Hedera Enhancement

**Goal**: Real LLM integration works end-to-end

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| `@taurus-ai/swarm-spawner-ai-sdk` package | 4 | `createAISDKExecutor()` works with OpenAI/Anthropic |
| Hedera topic-per-swarm | 3 | Each spawn() creates dedicated HCS topic |
| Hedera verification API | 3 | Given topicId, verify full agent lifecycle |
| Batch audit submission | 2 | Multiple certs in single HCS message (cost efficiency) |
| Integration test: full lifecycle | 3 | spawn→certify→execute→sign→audit→verify |
| Publish v0.3.0 | 1 | Both packages on npm |
| Blog post draft: "Why Every AI Agent Needs a Quantum-Safe Identity" | 4 | 1,500+ words, ready for Dev.to/Hashnode |

**Hours: ~20 / 20 available** (full capacity week)

---

## Week 4 (Apr 24-30): Interactive Playground + Content

**Goal**: Try before you install

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| Interactive HTML playground | 6 | Single file, runs in browser, shows lifecycle |
| Deploy playground to GitHub Pages | 1 | swarm-spawner.dev or taurus-ai.github.io/swarm-spawner |
| Record 2-min YouTube demo | 3 | Terminal walkthrough, face optional |
| Publish blog post (Dev.to + Hashnode) | 2 | Cross-posted, SEO optimized |
| Twitter/X thread draft | 2 | "I built the framework OpenAI Swarm should have been" |
| Build personal outreach list | 2 | 100 developers (GitHub, Twitter, Discord) |
| Seed 5-10 early supporters | 2 | DM with early access, ask for feedback |

**Hours: ~18 / 20 available**

**Content calendar**:
- Blog: Dev.to (Tue AM) → cross-post Hashnode (Wed)
- Twitter thread: Thu 9 AM ET
- YouTube: Fri

---

## Week 5 (May 1-7): LAUNCH WEEK

**Goal**: Hacker News front page + 500 stars in 7 days

| Day | Action | Target |
|-----|--------|--------|
| **Mon** | Personal outreach blast (100 devs) | 60 stars (60% conversion rate) |
| **Tue** | Hacker News Show HN (8-10 AM ET) | 500-1,200 stars |
| **Wed** | Reddit: r/LocalLLaMA + r/typescript + r/hedera | 100 stars |
| **Thu** | Twitter/X thread launch | Engagement, not stars |
| **Fri** | Product Hunt launch | 200 upvotes |
| **Sat** | Respond to all comments/issues | Community building |
| **Sun** | Retrospective + fix issues from feedback | Stability |

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| HN Show HN post | 2 | Title: "Show HN: Swarm Spawner – Ephemeral AI agents with PQC identity and Hedera audit trails" |
| Reddit posts (3 subreddits) | 2 | Tailored for each community |
| Twitter thread | 1 | 8-10 tweets with GIF |
| Product Hunt listing | 2 | Description, screenshots, maker comment |
| Community response | 8 | Answer every comment, fix every issue reported |
| Hotfix release if needed | 3 | v0.3.1 for any bugs found |

**Hours: ~18 / 20 available**

**HN Post Strategy** (based on research):
- Post Tuesday-Thursday, 8-10 AM ET
- Title: technical, honest, no hype
- Lead comment: explain the PQC + blockchain + ephemeral intersection
- Be transparent about what's stubbed vs real
- Respond to EVERY comment within 2 hours

---

## Week 6 (May 8-14): Monetization Infrastructure

**Goal**: Pro tier live, first paying customers

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| Stripe integration for Pro tier | 4 | $49/mo subscription, generates JWT license |
| License key validation in SDK | 2 | Pro features unlock with valid key |
| Pricing page (swarm-spawner.dev/pricing) | 3 | Free/Pro/Enterprise comparison table |
| EU AI Act compliance guide | 4 | "How Swarm Spawner helps you meet Article 14" |
| First 5 Pro outreach emails | 2 | Targeted at devs who starred + engaged |
| HBAR Foundation grant application | 3 | Leverage Hedera AI Agent Lab partnership |
| v0.4.0 release (Pro features) | 2 | PQC signing gated behind Pro |

**Hours: ~20 / 20 available**

**Revenue target**: 3 Pro subscribers = $147 MRR

---

## Week 7 (May 15-21): Enterprise Pipeline

**Goal**: 2+ enterprise conversations started

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| Enterprise landing page | 3 | swarm-spawner.dev/enterprise |
| EU AI Act compliance whitepaper | 4 | 3,000 words, downloadable PDF (lead magnet) |
| Cold outreach: 50 regulated companies | 4 | Fintech, health, defense — personalized emails |
| LinkedIn thought leadership post | 2 | "Why AI agents need quantum-safe identity NOW" |
| Second HN post (if first worked) | 2 | Technical deep-dive on PQC + blockchain audit |
| Integration guides | 3 | LangGraph + CrewAI + Mastra integration docs |
| Partnership outreach: Hedera + HBAR Foundation | 2 | Email + DM to Hedera AI Agent Lab team |

**Hours: ~20 / 20 available**

**Enterprise outreach targets**:
- Fintech: Companies with SOX/PCI compliance needs
- Health: HIPAA audit trail requirements
- Defense: CMMC + PQC mandates (CNSA 2.0)
- EU: Any company selling AI in EU (AI Act deadline 4 months away)

---

## Week 8 (May 22-29): Consolidate + Scale

**Goal**: Sustainable growth engine, revenue growing

| Deliverable | Hours | Acceptance Criteria |
|-------------|-------|---------------------|
| v0.5.0 release (stability) | 4 | All feedback from launch addressed |
| Documentation site | 4 | docs.swarm-spawner.dev (Docusaurus or similar) |
| Discord community | 2 | Server setup, welcome flow, 3 channels |
| Contributor guide + first issues | 2 | 5 "good first issue" labels |
| Second blog post | 3 | "Building a Compliance-Ready AI Agent System" |
| Weekly metrics dashboard | 2 | Stars, downloads, revenue, leads |
| Q2 roadmap | 3 | Next 3 months planned based on traction data |

**Hours: ~20 / 20 available**

---

## Budget Breakdown

| Item | Cost | Notes |
|------|------|-------|
| npm org (taurus-ai) | $0 | Free for public packages |
| Hedera testnet | $0 | Free testnet HBAR |
| Hedera mainnet (Pro tier) | ~$5/mo | HCS topic creation + messages |
| Stripe | 2.9% + $0.30/txn | Only on revenue |
| Domain (swarm-spawner.dev) | ~$12/yr | If desired |
| GitHub Pages | $0 | Free for public repos |
| Vercel (playground) | $0 | Free tier |
| **Total fixed cost** | **~$17/mo** | |

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| HN post doesn't get traction | 40% | High | Prepare Reddit + Twitter as backup channels. Try again 2 weeks later |
| PQC implementation bugs | 20% | High | Port from proven @taurus/pqc-crypto (13/13 tests). Use @noble/post-quantum directly |
| No Pro subscribers by week 6 | 50% | Medium | Fall back to PQC assessment services ($25-50K/engagement via hiero-cli-pqc) |
| Enterprise sales cycle too long | 70% | Medium | Expected. Enterprise leads in week 7 → close in Q3. Pro tier bridges |
| Competitor adds PQC/blockchain | 5% | Low | 4-month head start. Patent pending (USPTO provisional) |
| Hedera mainnet costs spike | 10% | Low | Batch submissions, usage caps |
| npm org name taken | 5% | Low | Fall back to @taurus-ai-corp/swarm-spawner |

---

## Growth Benchmarks (Reality Check)

Based on research of comparable launches:

| Timeframe | Realistic | Ambitious | Source |
|-----------|-----------|-----------|--------|
| Week 1 (pre-launch) | 20 stars | 50 stars | Personal network |
| Week 5 (HN launch) | 300 stars | 1,200 stars | HN Show HN average |
| Week 8 (post-launch) | 600 stars | 2,000 stars | Organic + content |
| Month 3 | 1,500 stars | 5,000 stars | Content flywheel |
| Month 6 | 3,000 stars | 10,000 stars | Community + integrations |

**Key insight**: First 100 stars from personal outreach (60% ask-to-star rate). HN is the multiplier. Content is the sustainer.

---

## Weekly Rhythm

```
Monday:    Build (code + tests)
Tuesday:   Build (code + tests)
Wednesday: Write (docs, blog, social)
Thursday:  Write (docs, blog, social) + Publish
Friday:    Ship (release, deploy) + Community
Weekend:   Respond to issues/comments
```

---

## What NOT to Do

1. **Don't build a dashboard/webapp** — SDK only. Dashboard comes after 1,000 stars
2. **Don't add more languages** — TypeScript first. Python/Rust/Go after traction
3. **Don't chase enterprise before proving dev adoption** — devs first (weeks 1-6), enterprise second (week 7+)
4. **Don't build a hosted service** — that's what killed Julep. SDK + self-host first
5. **Don't compete with LangGraph/CrewAI on features** — compete on the intersection they can't occupy
6. **Don't spend money on marketing** — content + community + HN/PH are free
7. **Don't over-engineer** — v0.2.0 should work in 10 lines, not require a PhD

---

## Decision Points

| Week | Decision | Options |
|------|----------|---------|
| Week 5 | HN traction? | Yes → double down on content. No → pivot to enterprise direct sales |
| Week 6 | Pro subscribers? | Yes → scale marketing. No → offer free Pro for 90 days, collect feedback |
| Week 8 | Enterprise leads? | Yes → build compliance features. No → focus on developer community |

---

## Exit Criteria (When to Pivot)

If by Week 8:
- < 100 stars AND < 100 npm downloads/week → Pivot to PQC consulting (use hiero-cli-pqc)
- 100-500 stars, 0 Pro subscribers → Remove paywall, go full open-source, seek grants
- 500+ stars, 3+ Pro subscribers → Plan is working, continue to Month 3 goals
- 1,000+ stars → You have product-market fit signal. Raise a pre-seed.
