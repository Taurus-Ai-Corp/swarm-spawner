/**
 * TierEnforcer — License-based tier enforcement for Swarm Spawner.
 *
 * Free / Pro ($49/mo) / Enterprise (custom).
 * License keys are simple JWTs (base64-encoded JSON, no crypto verification in v1).
 */

export type Tier = "free" | "pro" | "enterprise";

export interface LicensePayload {
  tier: Tier;
  org: string;
  exp: number; // Unix timestamp (seconds)
  maxAgents?: number; // enterprise custom limit
  features: string[]; // enabled feature flags
}

export interface TierLimits {
  maxAgentsPerSpawn: number;
  maxSpawnsPerDay: number;
  allowedNetworks: Array<"testnet" | "mainnet">;
  pqcSigningEnabled: boolean;
  allowedModelTiers: Array<"fast" | "balanced" | "deep">;
}

export type TierCheck =
  | { type: "agentCount"; count: number }
  | { type: "network"; network: "testnet" | "mainnet" }
  | { type: "pqcSigning" }
  | { type: "modelTier"; modelTier: "fast" | "balanced" | "deep" }
  | { type: "feature"; feature: string };

const UPGRADE_URL = "https://swarm-spawner.dev/pricing";

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    maxAgentsPerSpawn: 5,
    maxSpawnsPerDay: 10,
    allowedNetworks: ["testnet"],
    pqcSigningEnabled: false,
    allowedModelTiers: ["fast"],
  },
  pro: {
    maxAgentsPerSpawn: Infinity,
    maxSpawnsPerDay: Infinity,
    allowedNetworks: ["testnet", "mainnet"],
    pqcSigningEnabled: true,
    allowedModelTiers: ["fast", "balanced", "deep"],
  },
  enterprise: {
    maxAgentsPerSpawn: Infinity, // overridden by license maxAgents
    maxSpawnsPerDay: Infinity,
    allowedNetworks: ["testnet", "mainnet"],
    pqcSigningEnabled: true,
    allowedModelTiers: ["fast", "balanced", "deep"],
  },
};

export class TierEnforcer {
  private readonly tier: Tier;
  private readonly payload: LicensePayload;
  private readonly limits: TierLimits;

  constructor(licenseKey?: string) {
    if (!licenseKey) {
      this.tier = "free";
      this.payload = {
        tier: "free",
        org: "",
        exp: 0,
        features: [],
      };
      this.limits = { ...TIER_LIMITS.free };
      return;
    }

    this.payload = TierEnforcer.decodeLicense(licenseKey);

    // Check expiry
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (this.payload.exp <= nowSeconds) {
      throw new Error(
        `License expired. Renew at ${UPGRADE_URL}`,
      );
    }

    this.tier = this.payload.tier;
    this.limits = { ...TIER_LIMITS[this.tier] };

    // Enterprise: honour custom maxAgents from license
    if (
      this.tier === "enterprise" &&
      this.payload.maxAgents !== undefined
    ) {
      this.limits.maxAgentsPerSpawn = this.payload.maxAgents;
    }
  }

  /** Decode the middle segment of a JWT (base64-encoded JSON). */
  private static decodeLicense(key: string): LicensePayload {
    const parts = key.split(".");
    if (parts.length !== 3) {
      throw new Error(
        `Malformed license key: expected 3 JWT segments, got ${parts.length}. Upgrade at ${UPGRADE_URL}`,
      );
    }

    try {
      const json = atob(parts[1]!);
      const parsed: unknown = JSON.parse(json);
      return TierEnforcer.validatePayload(parsed);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Malformed license")) {
        throw err;
      }
      if (err instanceof Error && err.message.startsWith("License expired")) {
        throw err;
      }
      if (err instanceof Error && err.message.startsWith("Invalid license")) {
        throw err;
      }
      throw new Error(
        `Malformed license key: unable to decode payload. Upgrade at ${UPGRADE_URL}`,
      );
    }
  }

  private static validatePayload(data: unknown): LicensePayload {
    if (
      typeof data !== "object" ||
      data === null ||
      !("tier" in data) ||
      !("org" in data) ||
      !("exp" in data) ||
      !("features" in data)
    ) {
      throw new Error(
        `Invalid license payload: missing required fields. Upgrade at ${UPGRADE_URL}`,
      );
    }

    const d = data as Record<string, unknown>;

    if (
      d["tier"] !== "free" &&
      d["tier"] !== "pro" &&
      d["tier"] !== "enterprise"
    ) {
      throw new Error(
        `Invalid license payload: unknown tier "${String(d["tier"])}". Upgrade at ${UPGRADE_URL}`,
      );
    }

    return {
      tier: d["tier"] as Tier,
      org: String(d["org"]),
      exp: Number(d["exp"]),
      maxAgents:
        d["maxAgents"] !== undefined ? Number(d["maxAgents"]) : undefined,
      features: Array.isArray(d["features"])
        ? (d["features"] as string[])
        : [],
    };
  }

  /**
   * Enforce a tier check. Throws a descriptive error on violation.
   */
  enforce(check: TierCheck): void {
    switch (check.type) {
      case "agentCount": {
        if (check.count > this.limits.maxAgentsPerSpawn) {
          throw new Error(
            `Agent limit exceeded: ${check.count} requested, max ${this.limits.maxAgentsPerSpawn} on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
          );
        }
        break;
      }
      case "network": {
        if (
          !(this.limits.allowedNetworks as string[]).includes(check.network)
        ) {
          throw new Error(
            `Network "${check.network}" is not available on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
          );
        }
        break;
      }
      case "pqcSigning": {
        if (!this.limits.pqcSigningEnabled) {
          throw new Error(
            `PQC signing is not available on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
          );
        }
        break;
      }
      case "modelTier": {
        if (
          !(this.limits.allowedModelTiers as string[]).includes(
            check.modelTier,
          )
        ) {
          throw new Error(
            `Model tier "${check.modelTier}" is not available on ${this.tier} tier. Upgrade at ${UPGRADE_URL}`,
          );
        }
        break;
      }
      case "feature": {
        if (!this.isFeatureEnabled(check.feature)) {
          throw new Error(
            `Feature "${check.feature}" is not enabled for your license. Upgrade at ${UPGRADE_URL}`,
          );
        }
        break;
      }
    }
  }

  /** Returns the current tier. */
  getTier(): Tier {
    return this.tier;
  }

  /** Returns the TierLimits for the current tier. */
  getLimits(): TierLimits {
    return { ...this.limits };
  }

  /** Checks whether a feature flag is enabled in the license. */
  isFeatureEnabled(feature: string): boolean {
    return this.payload.features.includes(feature);
  }
}
