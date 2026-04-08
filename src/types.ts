import type { ModelConfig } from "./model-router.js";
import type { SignedCertificate } from "./pqc-identity.js";

export interface EphemeralAgent {
  id: string;
  task: string;
  model: ModelConfig;
  input: Record<string, unknown>;
  output?: unknown;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  birthCertificate?: SignedCertificate;
  deathCertificate?: SignedCertificate;
}

/**
 * Pluggable model executor function.
 * Adapters (AI SDK, Ollama, custom) implement this signature
 * and pass it via SwarmConfig.executor.
 */
export type ModelExecutor = (
  agent: EphemeralAgent,
  config: ModelConfig,
) => Promise<unknown>;
