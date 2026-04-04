import { describe, it, expect } from "vitest";
import { TierEnforcer } from "../src/tier-enforcer.js";
import type { LicensePayload } from "../src/tier-enforcer.js";

/** Create a test JWT with no crypto verification (alg: "none"). */
function createTestJWT(payload: Partial<LicensePayload>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(
    JSON.stringify({
      tier: "pro",
      org: "test-org",
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      features: [],
      ...payload,
    }),
  );
  return `${header}.${body}.nosig`;
}

describe("TierEnforcer", () => {
  // ── Tier resolution ───────────────────────────────────────────────

  it("defaults to free tier when no license key is provided", () => {
    const enforcer = new TierEnforcer();
    expect(enforcer.getTier()).toBe("free");
  });

  it("resolves to pro tier from a valid Pro JWT", () => {
    const key = createTestJWT({ tier: "pro" });
    const enforcer = new TierEnforcer(key);
    expect(enforcer.getTier()).toBe("pro");
  });

  it("resolves to enterprise tier from a valid Enterprise JWT", () => {
    const key = createTestJWT({ tier: "enterprise", maxAgents: 200 });
    const enforcer = new TierEnforcer(key);
    expect(enforcer.getTier()).toBe("enterprise");
  });

  // ── Free tier enforcement ─────────────────────────────────────────

  it("free tier blocks >5 agents", () => {
    const enforcer = new TierEnforcer();
    // 5 is fine
    expect(() => enforcer.enforce({ type: "agentCount", count: 5 })).not.toThrow();
    // 6 is not
    expect(() => enforcer.enforce({ type: "agentCount", count: 6 })).toThrowError(
      /Agent limit exceeded.*free tier/,
    );
  });

  it("free tier blocks mainnet", () => {
    const enforcer = new TierEnforcer();
    expect(() => enforcer.enforce({ type: "network", network: "testnet" })).not.toThrow();
    expect(() =>
      enforcer.enforce({ type: "network", network: "mainnet" }),
    ).toThrowError(/mainnet.*not available.*free tier/);
  });

  it("free tier blocks PQC signing", () => {
    const enforcer = new TierEnforcer();
    expect(() => enforcer.enforce({ type: "pqcSigning" })).toThrowError(
      /PQC signing.*not available.*free tier/,
    );
  });

  it("free tier blocks balanced and deep models", () => {
    const enforcer = new TierEnforcer();
    expect(() => enforcer.enforce({ type: "modelTier", modelTier: "fast" })).not.toThrow();
    expect(() =>
      enforcer.enforce({ type: "modelTier", modelTier: "balanced" }),
    ).toThrowError(/balanced.*not available.*free tier/);
    expect(() =>
      enforcer.enforce({ type: "modelTier", modelTier: "deep" }),
    ).toThrowError(/deep.*not available.*free tier/);
  });

  // ── Pro tier unlocks everything ───────────────────────────────────

  it("valid Pro JWT unlocks all features", () => {
    const key = createTestJWT({
      tier: "pro",
      features: ["audit-export"],
    });
    const enforcer = new TierEnforcer(key);

    // Large agent count
    expect(() => enforcer.enforce({ type: "agentCount", count: 1000 })).not.toThrow();
    // Mainnet
    expect(() => enforcer.enforce({ type: "network", network: "mainnet" })).not.toThrow();
    // PQC
    expect(() => enforcer.enforce({ type: "pqcSigning" })).not.toThrow();
    // All model tiers
    expect(() => enforcer.enforce({ type: "modelTier", modelTier: "fast" })).not.toThrow();
    expect(() => enforcer.enforce({ type: "modelTier", modelTier: "balanced" })).not.toThrow();
    expect(() => enforcer.enforce({ type: "modelTier", modelTier: "deep" })).not.toThrow();
  });

  // ── Enterprise tier with custom maxAgents ─────────────────────────

  it("enterprise tier enforces custom maxAgents from license", () => {
    const key = createTestJWT({
      tier: "enterprise",
      maxAgents: 50,
    });
    const enforcer = new TierEnforcer(key);
    expect(enforcer.getTier()).toBe("enterprise");
    expect(() => enforcer.enforce({ type: "agentCount", count: 50 })).not.toThrow();
    expect(() => enforcer.enforce({ type: "agentCount", count: 51 })).toThrowError(
      /Agent limit exceeded.*51.*max 50.*enterprise/,
    );
  });

  // ── Expired JWT ───────────────────────────────────────────────────

  it("expired JWT throws an error", () => {
    const key = createTestJWT({
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    });
    expect(() => new TierEnforcer(key)).toThrowError(/License expired/);
  });

  // ── Malformed JWT ─────────────────────────────────────────────────

  it("malformed JWT (wrong segment count) throws an error", () => {
    expect(() => new TierEnforcer("not-a-jwt")).toThrowError(
      /Malformed license key.*expected 3 JWT segments/,
    );
  });

  it("malformed JWT (bad base64) throws an error", () => {
    expect(() => new TierEnforcer("aaa.!!!invalid!!!.bbb")).toThrowError(
      /Malformed license key/,
    );
  });

  // ── isFeatureEnabled ──────────────────────────────────────────────

  it("isFeatureEnabled checks the features array from the license", () => {
    const key = createTestJWT({
      features: ["audit-export", "custom-models"],
    });
    const enforcer = new TierEnforcer(key);
    expect(enforcer.isFeatureEnabled("audit-export")).toBe(true);
    expect(enforcer.isFeatureEnabled("custom-models")).toBe(true);
    expect(enforcer.isFeatureEnabled("nonexistent-feature")).toBe(false);
  });

  it("free tier has no features enabled", () => {
    const enforcer = new TierEnforcer();
    expect(enforcer.isFeatureEnabled("audit-export")).toBe(false);
  });

  it("enforce feature check throws for disabled features", () => {
    const key = createTestJWT({ features: ["audit-export"] });
    const enforcer = new TierEnforcer(key);
    expect(() =>
      enforcer.enforce({ type: "feature", feature: "audit-export" }),
    ).not.toThrow();
    expect(() =>
      enforcer.enforce({ type: "feature", feature: "something-else" }),
    ).toThrowError(/Feature "something-else" is not enabled/);
  });

  // ── getLimits ─────────────────────────────────────────────────────

  it("getLimits returns correct limits for free tier", () => {
    const enforcer = new TierEnforcer();
    const limits = enforcer.getLimits();
    expect(limits.maxAgentsPerSpawn).toBe(5);
    expect(limits.maxSpawnsPerDay).toBe(10);
    expect(limits.allowedNetworks).toEqual(["testnet"]);
    expect(limits.pqcSigningEnabled).toBe(false);
    expect(limits.allowedModelTiers).toEqual(["fast"]);
  });

  it("getLimits returns correct limits for pro tier", () => {
    const key = createTestJWT({ tier: "pro" });
    const enforcer = new TierEnforcer(key);
    const limits = enforcer.getLimits();
    expect(limits.maxAgentsPerSpawn).toBe(Infinity);
    expect(limits.maxSpawnsPerDay).toBe(Infinity);
    expect(limits.allowedNetworks).toEqual(["testnet", "mainnet"]);
    expect(limits.pqcSigningEnabled).toBe(true);
    expect(limits.allowedModelTiers).toEqual(["fast", "balanced", "deep"]);
  });

  it("getLimits returns correct limits for enterprise tier with custom maxAgents", () => {
    const key = createTestJWT({ tier: "enterprise", maxAgents: 100 });
    const enforcer = new TierEnforcer(key);
    const limits = enforcer.getLimits();
    expect(limits.maxAgentsPerSpawn).toBe(100);
    expect(limits.maxSpawnsPerDay).toBe(Infinity);
    expect(limits.allowedNetworks).toEqual(["testnet", "mainnet"]);
    expect(limits.pqcSigningEnabled).toBe(true);
    expect(limits.allowedModelTiers).toEqual(["fast", "balanced", "deep"]);
  });

  it("getLimits returns a copy (not a reference)", () => {
    const enforcer = new TierEnforcer();
    const a = enforcer.getLimits();
    const b = enforcer.getLimits();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  // ── Upgrade URL in error messages ─────────────────────────────────

  it("all error messages include the upgrade URL", () => {
    const enforcer = new TierEnforcer();
    const checks = [
      () => enforcer.enforce({ type: "agentCount", count: 100 }),
      () => enforcer.enforce({ type: "network", network: "mainnet" }),
      () => enforcer.enforce({ type: "pqcSigning" }),
      () => enforcer.enforce({ type: "modelTier", modelTier: "deep" }),
      () => enforcer.enforce({ type: "feature", feature: "nope" }),
    ];
    for (const check of checks) {
      expect(check).toThrowError(/swarm-spawner\.dev\/pricing/);
    }
  });
});
