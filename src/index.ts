// Barrel export — this is the package entry point
// Every public type and class must be re-exported here

export {
  SwarmSpawner,
  defaultExecutor,
  type EphemeralAgent,
  type SwarmConfig,
  type SpawnRequest,
  type ModelExecutor,
} from "./spawner.js";

export { ModelRouter, type ModelConfig } from "./model-router.js";

export {
  HederaIntegration,
  type AuditEntry,
  type PQCSigningResult,
} from "./hedera-integration.js";

export {
  ResultAggregator,
  type AggregatedResult,
} from "./result-aggregator.js";

export {
  TierEnforcer,
  type Tier,
  type LicensePayload,
  type TierLimits,
  type TierCheck,
} from "./tier-enforcer.js";

export {
  PQCIdentityManager,
  type SignedCertificate,
  type AgentIdentity,
  type PQCIdentityConfig,
} from "./pqc-identity.js";

export {
  LicenseManager,
  type LicenseOptions,
} from "./license.js";
