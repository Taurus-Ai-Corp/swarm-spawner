import { describe, it, expect } from "vitest";
import { PQCIdentityManager } from "../src/pqc-identity.js";
import type { SignedCertificate } from "../src/pqc-identity.js";

/** Deterministic 32-byte seed for testing */
const TEST_SEED = new Uint8Array(32).fill(42);

function makeManager(): PQCIdentityManager {
  return new PQCIdentityManager({ masterSeed: TEST_SEED });
}

const AGENT = {
  id: "agent-test-001",
  task: "Analyze code for vulnerabilities",
  model: { model: "claude-sonnet-4-20250514" },
};

const SWARM_ID = "swarm-test-abc";

describe("PQCIdentityManager", () => {
  describe("constructor", () => {
    it("accepts a 32-byte seed", () => {
      expect(() => makeManager()).not.toThrow();
    });

    it("rejects a seed shorter than 32 bytes", () => {
      expect(
        () => new PQCIdentityManager({ masterSeed: new Uint8Array(16) }),
      ).toThrow("masterSeed must be at least 32 bytes");
    });
  });

  describe("deriveAgentKey", () => {
    it("is deterministic — same seed+context produces same key", () => {
      const mgr = makeManager();
      const key1 = mgr.deriveAgentKey(SWARM_ID, AGENT.id);
      const key2 = mgr.deriveAgentKey(SWARM_ID, AGENT.id);

      expect(key1.publicKey).toEqual(key2.publicKey);
      expect(key1.secretKey).toEqual(key2.secretKey);
    });

    it("different contexts produce different keys", () => {
      const mgr = makeManager();
      const key1 = mgr.deriveAgentKey(SWARM_ID, "agent-a");
      const key2 = mgr.deriveAgentKey(SWARM_ID, "agent-b");

      expect(key1.publicKey).not.toEqual(key2.publicKey);
    });

    it("different swarm IDs produce different keys", () => {
      const mgr = makeManager();
      const key1 = mgr.deriveAgentKey("swarm-1", AGENT.id);
      const key2 = mgr.deriveAgentKey("swarm-2", AGENT.id);

      expect(key1.publicKey).not.toEqual(key2.publicKey);
    });
  });

  describe("issueBirthCertificate", () => {
    it("returns a signed birth certificate", () => {
      const mgr = makeManager();
      const cert = mgr.issueBirthCertificate(AGENT, SWARM_ID);

      expect(cert.type).toBe("birth");
      expect(cert.algorithm).toBe("ML-DSA-65");
      expect(cert.payload["agentId"]).toBe(AGENT.id);
      expect(cert.payload["task"]).toBe(AGENT.task);
      expect(cert.payload["model"]).toBe(AGENT.model.model);
      expect(cert.payload["swarmId"]).toBe(SWARM_ID);
      expect(cert.signature).toBeInstanceOf(Uint8Array);
      expect(cert.publicKey).toBeInstanceOf(Uint8Array);
      expect(cert.signature.length).toBeGreaterThan(0);
    });

    it("passes verification", () => {
      const mgr = makeManager();
      const cert = mgr.issueBirthCertificate(AGENT, SWARM_ID);

      expect(PQCIdentityManager.verify(cert)).toBe(true);
    });
  });

  describe("issueDeathCertificate", () => {
    it("returns a signed death certificate for completed agent", () => {
      const mgr = makeManager();
      const completedAgent = {
        id: AGENT.id,
        status: "completed",
        output: { result: "No vulnerabilities found" },
      };
      const cert = mgr.issueDeathCertificate(completedAgent, SWARM_ID);

      expect(cert.type).toBe("death");
      expect(cert.algorithm).toBe("ML-DSA-65");
      expect(cert.payload["agentId"]).toBe(AGENT.id);
      expect(cert.payload["status"]).toBe("completed");
      expect(cert.payload["resultHash"]).toBeDefined();
      expect(typeof cert.payload["resultHash"]).toBe("string");
    });

    it("returns a signed death certificate for failed agent", () => {
      const mgr = makeManager();
      const failedAgent = {
        id: AGENT.id,
        status: "failed",
        error: "Model provider unavailable",
      };
      const cert = mgr.issueDeathCertificate(failedAgent, SWARM_ID);

      expect(cert.type).toBe("death");
      expect(cert.payload["status"]).toBe("failed");
      expect(PQCIdentityManager.verify(cert)).toBe(true);
    });

    it("includes audit reference when provided", () => {
      const mgr = makeManager();
      const auditRef = { topicId: "0.0.12345", sequenceNumber: 7 };
      const cert = mgr.issueDeathCertificate(
        { id: AGENT.id, status: "completed", output: {} },
        SWARM_ID,
        auditRef,
      );

      expect(cert.payload["auditRef"]).toEqual(auditRef);
    });

    it("passes verification", () => {
      const mgr = makeManager();
      const cert = mgr.issueDeathCertificate(
        { id: AGENT.id, status: "completed", output: {} },
        SWARM_ID,
      );

      expect(PQCIdentityManager.verify(cert)).toBe(true);
    });
  });

  describe("verify", () => {
    it("rejects a tampered certificate", () => {
      const mgr = makeManager();
      const cert = mgr.issueBirthCertificate(AGENT, SWARM_ID);

      // Tamper with the payload
      const tampered: SignedCertificate = {
        ...cert,
        payload: { ...cert.payload, task: "TAMPERED TASK" },
      };

      expect(PQCIdentityManager.verify(tampered)).toBe(false);
    });

    it("rejects a certificate with wrong public key", () => {
      const mgr = makeManager();
      const cert = mgr.issueBirthCertificate(AGENT, SWARM_ID);

      // Use a different agent's public key
      const otherKey = mgr.deriveAgentKey(SWARM_ID, "other-agent");
      const wrongKey: SignedCertificate = {
        ...cert,
        publicKey: otherKey.publicKey,
      };

      expect(PQCIdentityManager.verify(wrongKey)).toBe(false);
    });
  });
});
