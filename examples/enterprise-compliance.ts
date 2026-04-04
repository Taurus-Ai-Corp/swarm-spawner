/**
 * Enterprise Integration Example — Swarm Spawner
 *
 * Shows how a fintech compliance team would use Swarm Spawner
 * to run auditable AI agent swarms for regulatory compliance.
 *
 * Architecture:
 *   Enterprise App → SwarmSpawner → LLM Provider (pluggable)
 *                  → PQC Identity (ML-DSA-65 certs)
 *                  → Hedera HCS (immutable audit trail)
 *                  → TierEnforcer (Pro license)
 */

import {
  SwarmSpawner,
  PQCIdentityManager,
  LicenseManager,
  type ModelExecutor,
  type EphemeralAgent,
} from "@taurus-ai/swarm-spawner";

// ─── Simulate an enterprise LLM executor ───────────────────────
// In production, replace with Anthropic/OpenAI/Ollama SDK calls
const enterpriseExecutor: ModelExecutor = async (agent, config) => {
  const start = Date.now();

  // Simulate different processing times based on task complexity
  const delay = config.cost === "high" ? 200 : config.cost === "medium" ? 100 : 50;
  await new Promise((r) => setTimeout(r, delay));

  return {
    agentId: agent.id,
    task: agent.task,
    model: config.model,
    provider: config.provider,
    result: `[${config.provider}/${config.model}] Analysis complete for: ${agent.task}`,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  };
};

// ─── Enterprise compliance swarm ───────────────────────────────
async function runComplianceAudit() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Enterprise Compliance Audit — Swarm Spawner Demo      ║");
  console.log("║  EU AI Act Readiness Assessment                        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Step 1: Generate PQC key pair (done ONCE, stored in HSM/vault)
  console.log("Step 1: PQC Key Generation (ML-DSA-65 / NIST FIPS 204)");
  const keyPair = LicenseManager.generateKeyPair();
  console.log(`  ✓ Public key:  ${keyPair.publicKey.length} bytes`);
  console.log(`  ✓ Secret key:  ${keyPair.secretKey.length} bytes`);
  console.log(`  ✓ Algorithm:   ML-DSA-65 (lattice-based, quantum-resistant)\n`);

  // Step 2: Generate Pro license (billing server does this on Stripe webhook)
  console.log("Step 2: License Activation (ML-DSA-65 signed)");
  const issuer = LicenseManager.fromKeyPair(keyPair.secretKey, keyPair.publicKey);
  const licenseKey = issuer.generate({
    tier: "pro",
    org: "AcmeFintech Corp",
    durationDays: 30,
    features: ["pqc-signing", "mainnet", "audit-export", "all-model-tiers"],
  });
  console.log(`  ✓ License:     Pro tier (ML-DSA-65 signed)`);
  console.log(`  ✓ Org:         AcmeFintech Corp`);
  console.log(`  ✓ Valid:       30 days`);
  console.log(`  ✓ Key length:  ${licenseKey.length} chars (PQC signature = ~4.4KB)\n`);

  // Step 3: Verify license (consumer side — only public key needed)
  console.log("Step 3: License Verification (public key only)");
  const verifier = LicenseManager.fromPublicKey(keyPair.publicKey);
  const payload = verifier.verify(licenseKey);
  console.log(`  ✓ Tier:        ${payload.tier}`);
  console.log(`  ✓ Org:         ${payload.org}`);
  console.log(`  ✓ Features:    ${payload.features.join(", ")}`);
  console.log(`  ✓ Signature:   VALID (ML-DSA-65 verified)\n`);

  // Step 4: Create spawner with PQC identity + Pro license
  console.log("Step 4: Initialize Swarm Spawner");
  const spawner = new SwarmSpawner({
    licenseKey,
    executor: enterpriseExecutor,
    pqcIdentity: { masterSeed: keyPair.publicKey.slice(0, 32) },
    enableAuditTrail: false, // set true with HEDERA_OPERATOR_ID for blockchain
    timeout: 30000,
  });
  console.log(`  ✓ Tier:        ${spawner.getTier()}`);
  console.log(`  ✓ PQC:         ML-DSA-65 agent identity enabled`);
  console.log(`  ✓ Executor:    Enterprise LLM (pluggable)\n`);

  // Step 5: Spawn compliance audit swarm
  console.log("Step 5: Spawning EU AI Act Compliance Swarm");
  console.log("  ─────────────────────────────────────────\n");

  // Track lifecycle events
  spawner.on("agent:start", (agent: EphemeralAgent) => {
    console.log(`  🚀 SPAWN   ${agent.id.slice(0, 20)}... → ${agent.task.slice(0, 50)}`);
  });
  spawner.on("agent:certified", (evt: { agentId: string; type: string }) => {
    console.log(`  🔐 CERT    ${evt.agentId.slice(0, 20)}... → ${evt.type} certificate (ML-DSA-65)`);
  });
  spawner.on("agent:complete", (agent: EphemeralAgent) => {
    console.log(`  ${agent.status === "completed" ? "✅" : "❌"} DONE    ${agent.id.slice(0, 20)}... → ${agent.status}`);
  });

  const result = await spawner.spawn({
    tasks: [
      {
        id: "risk-classification",
        description: "Classify AI system risk level per EU AI Act Article 6",
        input: { system: "automated lending decisions", sector: "financial services" },
        modelTier: "deep",
      },
      {
        id: "transparency-check",
        description: "Verify AI transparency obligations per EU AI Act Article 13",
        input: { checkpoints: ["model card", "data provenance", "decision explainability"] },
        modelTier: "balanced",
      },
      {
        id: "data-governance",
        description: "Audit training data governance per EU AI Act Article 10",
        input: { datasets: ["credit_scores", "transaction_history", "demographic_data"] },
        modelTier: "balanced",
      },
      {
        id: "human-oversight",
        description: "Evaluate human oversight mechanisms per EU AI Act Article 14",
        input: { mechanisms: ["kill switch", "appeal process", "manual review threshold"] },
        modelTier: "fast",
      },
      {
        id: "pqc-readiness",
        description: "Assess post-quantum cryptography readiness for AI model signing",
        input: { current_crypto: ["RSA-2048", "ECDSA-P256"], target: ["ML-DSA-65", "ML-KEM-768"] },
        modelTier: "deep",
      },
    ],
    strategy: "parallel",
  });

  // Step 6: Results + Certificate verification
  console.log("\n  ─────────────────────────────────────────");
  console.log("\nStep 6: Audit Results\n");

  console.log(`  Total agents:  ${result.totalAgents}`);
  console.log(`  Succeeded:     ${result.successCount}`);
  console.log(`  Failed:        ${result.failureCount}`);
  console.log(`  Success rate:  ${(result.successRate * 100).toFixed(0)}%`);
  console.log(`  Total time:    ${result.totalDuration}ms\n`);

  // Verify all certificates
  console.log("Step 7: Certificate Verification\n");
  const agents = spawner.getActiveAgents();
  let allValid = true;

  for (const agent of agents) {
    const birthValid = agent.birthCertificate
      ? PQCIdentityManager.verify(agent.birthCertificate)
      : false;
    const deathValid = agent.deathCertificate
      ? PQCIdentityManager.verify(agent.deathCertificate)
      : false;

    const status = birthValid && deathValid ? "✅ VALID" : "❌ INVALID";
    if (!birthValid || !deathValid) allValid = false;

    console.log(`  ${status}  ${agent.id.slice(0, 25)}...`);
    console.log(`           Birth: ${birthValid ? "ML-DSA-65 ✓" : "MISSING"}  Death: ${deathValid ? "ML-DSA-65 ✓" : "MISSING"}`);
  }

  console.log(`\n  All certificates valid: ${allValid ? "YES ✅" : "NO ❌"}`);
  console.log(`  Algorithm:              ML-DSA-65 (NIST FIPS 204)`);
  console.log(`  Quantum-safe:           YES`);
  console.log(`  Audit trail:            Ready for Hedera HCS (enable with HEDERA_OPERATOR_ID)`);

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  EU AI Act Compliance Audit Complete                    ║");
  console.log("║  All agent decisions PQC-signed + verifiable            ║");
  console.log("║  Ready for regulatory submission                       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  spawner.destroy();
}

runComplianceAudit().catch(console.error);
