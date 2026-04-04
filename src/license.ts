/**
 * LicenseManager — ML-DSA-65 (NIST FIPS 204) signed license keys.
 *
 * Asymmetric PQC signing: billing server holds the secret key,
 * npm package consumers only need the public key to verify.
 * Even if the package is decompiled, license keys cannot be forged.
 *
 * Flow:
 *   Billing server (has secretKey):
 *     const issuer = LicenseManager.fromKeyPair(secretKey, publicKey);
 *     const key = issuer.generate({ tier: "pro", org: "acme" });
 *
 *   npm package consumer (has publicKey only):
 *     const verifier = LicenseManager.fromPublicKey(publicKey);
 *     const payload = verifier.verify(key); // works — asymmetric
 */

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

import type { Tier, LicensePayload } from "./tier-enforcer.js";

const encoder = new TextEncoder();

/** Base64url encode (JWT-safe, no padding) */
function base64url(data: Uint8Array | string): string {
  const str =
    typeof data === "string"
      ? btoa(data)
      : btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Base64url decode to bytes */
function base64urlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Base64url decode to string */
function base64urlToString(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

export interface LicenseOptions {
  tier: Tier;
  org: string;
  /** Duration in days (default: 30) */
  durationDays?: number;
  /** Enterprise: custom max agents per spawn */
  maxAgents?: number;
  /** Feature flags to enable */
  features?: string[];
  /** Stripe subscription ID for tracking */
  stripeSubscriptionId?: string;
}

export interface LicenseKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export class LicenseManager {
  private publicKey: Uint8Array;
  private secretKey?: Uint8Array;

  private constructor(publicKey: Uint8Array, secretKey?: Uint8Array) {
    this.publicKey = publicKey;
    this.secretKey = secretKey;
  }

  /**
   * Create a LicenseManager that can both generate AND verify keys.
   * Use this on your billing server.
   */
  static fromKeyPair(
    secretKey: Uint8Array,
    publicKey: Uint8Array,
  ): LicenseManager {
    return new LicenseManager(publicKey, secretKey);
  }

  /**
   * Create a LicenseManager that can only VERIFY keys.
   * Use this in the npm package / consumer code.
   */
  static fromPublicKey(publicKey: Uint8Array): LicenseManager {
    return new LicenseManager(publicKey);
  }

  /**
   * Create from hex-encoded keys (convenient for env vars).
   * Hex public key = 3,904 chars. Hex secret key = 8,064 chars.
   */
  static fromHex(
    publicKeyHex: string,
    secretKeyHex?: string,
  ): LicenseManager {
    const publicKey = hexToBytes(publicKeyHex);
    const secretKey = secretKeyHex ? hexToBytes(secretKeyHex) : undefined;
    return new LicenseManager(publicKey, secretKey);
  }

  /**
   * Generate a fresh ML-DSA-65 key pair for license signing.
   * Call once during initial setup, store keys securely.
   */
  static generateKeyPair(seed?: Uint8Array): LicenseKeyPair {
    const actualSeed = seed ?? sha256(encoder.encode(`license-${Date.now()}`));
    return ml_dsa65.keygen(actualSeed);
  }

  /** Returns the public key as hex (for embedding in code or config). */
  getPublicKeyHex(): string {
    return bytesToHex(this.publicKey);
  }

  /**
   * Generate a PQC-signed license key. Requires secret key (billing server only).
   * Format: header.payload.signature (JWT-like, ML-DSA-65 signed)
   */
  generate(options: LicenseOptions): string {
    if (!this.secretKey) {
      throw new Error(
        "Cannot generate license keys without a secret key. " +
          "Use LicenseManager.fromKeyPair() on your billing server.",
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + (options.durationDays ?? 30) * 86400;

    const payload: LicensePayload & { iat: number; sub?: string } = {
      tier: options.tier,
      org: options.org,
      exp,
      iat: now,
      features: options.features ?? [],
      maxAgents: options.maxAgents,
      sub: options.stripeSubscriptionId,
    };

    const header = base64url(
      JSON.stringify({ alg: "ML-DSA-65", typ: "JWT" }),
    );
    const body = base64url(JSON.stringify(payload));
    const message = encoder.encode(`${header}.${body}`);
    const signature = ml_dsa65.sign(message, this.secretKey);

    return `${header}.${body}.${base64url(signature)}`;
  }

  /**
   * Verify a license key using the public key. Returns payload if valid.
   * Only needs the public key — safe to embed in published npm packages.
   */
  verify(licenseKey: string): LicensePayload {
    const parts = licenseKey.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid license key format");
    }

    const [header, body, sig] = parts;
    const message = encoder.encode(`${header}.${body}`);
    const signature = base64urlToBytes(sig!);

    const valid = ml_dsa65.verify(signature, message, this.publicKey);
    if (!valid) {
      throw new Error(
        "Invalid license key signature — key may be forged or corrupted",
      );
    }

    const payload = JSON.parse(base64urlToString(body!));

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp <= now) {
      throw new Error("License key expired");
    }

    return payload as LicensePayload;
  }
}
