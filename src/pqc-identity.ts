/**
 * PQCIdentityManager — Quantum-safe agent identity with ML-DSA-65.
 *
 * Every ephemeral agent receives a birth certificate at spawn
 * and a death certificate at completion/failure, both signed
 * with ML-DSA-65 (NIST FIPS 204).
 *
 * Key derivation: masterSeed + context → SHA-256 → ml_dsa65.keygen()
 */

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export interface SignedCertificate {
  type: "birth" | "death";
  payload: Record<string, unknown>;
  signature: Uint8Array;
  publicKey: Uint8Array;
  algorithm: "ML-DSA-65";
  timestamp: string;
}

export interface AgentIdentity {
  agentId: string;
  publicKey: Uint8Array;
  birthCertificate: SignedCertificate;
  deathCertificate?: SignedCertificate;
}

export interface PQCIdentityConfig {
  masterSeed: Uint8Array; // 32 bytes
}

const encoder = new TextEncoder();

export class PQCIdentityManager {
  private masterSeed: Uint8Array;
  private keyCache: Map<string, { publicKey: Uint8Array; secretKey: Uint8Array }> =
    new Map();

  constructor(config: PQCIdentityConfig) {
    if (config.masterSeed.length < 32) {
      throw new Error("masterSeed must be at least 32 bytes");
    }
    this.masterSeed = config.masterSeed;
  }

  /**
   * Derive a deterministic per-agent key pair.
   * SHA-256(masterSeed ║ UTF8("swarmId:agentId")) → 32-byte seed → keygen
   */
  deriveAgentKey(
    swarmId: string,
    agentId: string,
  ): { publicKey: Uint8Array; secretKey: Uint8Array } {
    const cacheKey = `${swarmId}:${agentId}`;
    const cached = this.keyCache.get(cacheKey);
    if (cached) return cached;

    const context = encoder.encode(cacheKey);
    const combined = new Uint8Array(this.masterSeed.length + context.length);
    combined.set(this.masterSeed);
    combined.set(context, this.masterSeed.length);
    const derivedSeed = sha256(combined);
    const keyPair = ml_dsa65.keygen(derivedSeed);
    this.keyCache.set(cacheKey, keyPair);
    return keyPair;
  }

  /** Clear cached keys (call after swarm completes). */
  clearKeyCache(): void {
    this.keyCache.clear();
  }

  /** Issue a PQC-signed birth certificate when agent spawns. */
  issueBirthCertificate(
    agent: { id: string; task: string; model: { model: string } },
    swarmId: string,
  ): SignedCertificate {
    const keyPair = this.deriveAgentKey(swarmId, agent.id);
    const timestamp = new Date().toISOString();

    const payload: Record<string, unknown> = {
      type: "birth",
      agentId: agent.id,
      task: agent.task,
      model: agent.model.model,
      swarmId,
      timestamp,
    };

    const message = encoder.encode(JSON.stringify(payload));
    const signature = ml_dsa65.sign(message, keyPair.secretKey);

    return {
      type: "birth",
      payload,
      signature,
      publicKey: keyPair.publicKey,
      algorithm: "ML-DSA-65",
      timestamp,
    };
  }

  /** Issue a PQC-signed death certificate when agent completes/fails. */
  issueDeathCertificate(
    agent: { id: string; status: string; output?: unknown; error?: string },
    swarmId: string,
    auditRef?: { topicId: string; sequenceNumber: number },
  ): SignedCertificate {
    const keyPair = this.deriveAgentKey(swarmId, agent.id);
    const timestamp = new Date().toISOString();

    const resultHash = bytesToHex(
      sha256(
        encoder.encode(JSON.stringify(agent.output ?? agent.error ?? "")),
      ),
    );

    const payload: Record<string, unknown> = {
      type: "death",
      agentId: agent.id,
      status: agent.status,
      resultHash,
      auditRef: auditRef ?? null,
      timestamp,
    };

    const message = encoder.encode(JSON.stringify(payload));
    const signature = ml_dsa65.sign(message, keyPair.secretKey);

    return {
      type: "death",
      payload,
      signature,
      publicKey: keyPair.publicKey,
      algorithm: "ML-DSA-65",
      timestamp,
    };
  }

  /** Verify any signed certificate. */
  static verify(cert: SignedCertificate): boolean {
    const message = encoder.encode(JSON.stringify(cert.payload));
    return ml_dsa65.verify(cert.signature, message, cert.publicKey);
  }
}
