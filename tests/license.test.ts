import { describe, it, expect } from "vitest";
import { LicenseManager } from "../src/license.js";

/** Generate a deterministic key pair for testing */
function testKeyPair() {
  const seed = new Uint8Array(32).fill(88);
  return LicenseManager.generateKeyPair(seed);
}

describe("LicenseManager (ML-DSA-65)", () => {
  describe("generateKeyPair", () => {
    it("generates a valid ML-DSA-65 key pair", () => {
      const kp = testKeyPair();
      expect(kp.publicKey).toBeInstanceOf(Uint8Array);
      expect(kp.secretKey).toBeInstanceOf(Uint8Array);
      expect(kp.publicKey.length).toBe(1952);
      expect(kp.secretKey.length).toBe(4032);
    });

    it("is deterministic with same seed", () => {
      const kp1 = testKeyPair();
      const kp2 = testKeyPair();
      expect(kp1.publicKey).toEqual(kp2.publicKey);
      expect(kp1.secretKey).toEqual(kp2.secretKey);
    });
  });

  describe("generate", () => {
    it("generates a 3-part JWT-like license key", () => {
      const kp = testKeyPair();
      const mgr = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = mgr.generate({ tier: "pro", org: "test-corp" });

      const parts = key.split(".");
      expect(parts).toHaveLength(3);
    });

    it("header contains ML-DSA-65 algorithm", () => {
      const kp = testKeyPair();
      const mgr = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = mgr.generate({ tier: "pro", org: "test" });

      const header = JSON.parse(atob(key.split(".")[0]!.replace(/-/g, "+").replace(/_/g, "/")));
      expect(header.alg).toBe("ML-DSA-65");
      expect(header.typ).toBe("JWT");
    });

    it("throws without secret key", () => {
      const kp = testKeyPair();
      const verifier = LicenseManager.fromPublicKey(kp.publicKey);

      expect(() =>
        verifier.generate({ tier: "pro", org: "test" }),
      ).toThrow("Cannot generate license keys without a secret key");
    });

    it("embeds correct tier, org, and features", () => {
      const kp = testKeyPair();
      const mgr = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = mgr.generate({
        tier: "enterprise",
        org: "acme-inc",
        maxAgents: 50,
        features: ["audit-export", "pqc-signing"],
      });

      const payload = mgr.verify(key);
      expect(payload.tier).toBe("enterprise");
      expect(payload.org).toBe("acme-inc");
      expect(payload.maxAgents).toBe(50);
      expect(payload.features).toEqual(["audit-export", "pqc-signing"]);
    });

    it("sets expiry based on durationDays", () => {
      const kp = testKeyPair();
      const mgr = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = mgr.generate({ tier: "pro", org: "test", durationDays: 7 });
      const payload = mgr.verify(key);

      const now = Math.floor(Date.now() / 1000);
      const expected = now + 7 * 86400;
      expect(Math.abs(payload.exp - expected)).toBeLessThan(5);
    });
  });

  describe("verify", () => {
    it("verifies a valid key with public key only", () => {
      const kp = testKeyPair();
      const issuer = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = issuer.generate({ tier: "pro", org: "verify-test" });

      // Verify with public key only — the npm package consumer path
      const verifier = LicenseManager.fromPublicKey(kp.publicKey);
      const payload = verifier.verify(key);

      expect(payload.tier).toBe("pro");
      expect(payload.org).toBe("verify-test");
    });

    it("rejects key signed with a different key pair", () => {
      const kp1 = LicenseManager.generateKeyPair(new Uint8Array(32).fill(1));
      const kp2 = LicenseManager.generateKeyPair(new Uint8Array(32).fill(2));

      const issuer = LicenseManager.fromKeyPair(kp1.secretKey, kp1.publicKey);
      const key = issuer.generate({ tier: "pro", org: "test" });

      const wrongVerifier = LicenseManager.fromPublicKey(kp2.publicKey);
      expect(() => wrongVerifier.verify(key)).toThrow("Invalid license key signature");
    });

    it("rejects a tampered payload", () => {
      const kp = testKeyPair();
      const issuer = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = issuer.generate({ tier: "pro", org: "legit" });

      // Tamper the payload
      const parts = key.split(".");
      const fakePayload = btoa(
        JSON.stringify({ tier: "enterprise", org: "hacker", exp: 9999999999, features: [] }),
      ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const tampered = `${parts[0]}.${fakePayload}.${parts[2]}`;

      const verifier = LicenseManager.fromPublicKey(kp.publicKey);
      expect(() => verifier.verify(tampered)).toThrow("Invalid license key signature");
    });

    it("rejects an expired key", () => {
      const kp = testKeyPair();
      const mgr = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = mgr.generate({ tier: "pro", org: "test", durationDays: -1 });

      expect(() => mgr.verify(key)).toThrow("License key expired");
    });

    it("rejects malformed key", () => {
      const kp = testKeyPair();
      const verifier = LicenseManager.fromPublicKey(kp.publicKey);

      expect(() => verifier.verify("bad")).toThrow("Invalid license key format");
      expect(() => verifier.verify("a.b.c.d.e")).toThrow("Invalid license key format");
    });
  });

  describe("fromHex", () => {
    it("round-trips through hex encoding", () => {
      const kp = testKeyPair();
      const issuer = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const publicHex = issuer.getPublicKeyHex();

      // Reconstruct verifier from hex
      const verifier = LicenseManager.fromHex(publicHex);
      const key = issuer.generate({ tier: "pro", org: "hex-test" });
      const payload = verifier.verify(key);

      expect(payload.tier).toBe("pro");
      expect(payload.org).toBe("hex-test");
    });
  });

  describe("integration with TierEnforcer", () => {
    it("ML-DSA-65 signed key works with TierEnforcer", async () => {
      const { TierEnforcer } = await import("../src/tier-enforcer.js");

      const kp = testKeyPair();
      const issuer = LicenseManager.fromKeyPair(kp.secretKey, kp.publicKey);
      const key = issuer.generate({ tier: "pro", org: "tier-test" });

      // TierEnforcer decodes payload (without PQC verification — that's LicenseManager's job)
      const enforcer = new TierEnforcer(key);
      expect(enforcer.getTier()).toBe("pro");
      expect(() => enforcer.enforce({ type: "pqcSigning" })).not.toThrow();
      expect(() => enforcer.enforce({ type: "modelTier", modelTier: "deep" })).not.toThrow();
    });
  });
});
