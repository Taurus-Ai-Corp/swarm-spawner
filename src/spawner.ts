import { EventEmitter } from "events";
import { ModelRouter } from "./model-router.js";
import { HederaIntegration, AuditEntry } from "./hedera-integration.js";
import { ResultAggregator, AggregatedResult } from "./result-aggregator.js";
import {
  PQCIdentityManager,
  type PQCIdentityConfig,
} from "./pqc-identity.js";
import { TierEnforcer, type Tier } from "./tier-enforcer.js";
import type { EphemeralAgent, ModelExecutor } from "./types.js";

export type { EphemeralAgent, ModelExecutor };

/**
 * Default echo executor — mirrors the original stub behavior.
 * Returns a deterministic result without calling any model.
 */
export const defaultExecutor: ModelExecutor = async (agent) => {
  return { agentId: agent.id, result: `Processed: ${agent.task}` };
};

export interface SwarmConfig {
  maxParallel: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableAuditTrail: boolean;
  hederaNetwork: "testnet" | "mainnet";
  /** @deprecated Use pqcIdentity instead */
  pqcKeyPair?: {
    publicKey: string;
    privateKey: string;
  };
  /** PQC identity config — enables ML-DSA-65 birth/death certificates (Pro tier) */
  pqcIdentity?: PQCIdentityConfig;
  /** License key (JWT) — unlocks Pro/Enterprise features */
  licenseKey?: string;
  /** Pluggable model executor. Falls back to defaultExecutor if omitted. */
  executor?: ModelExecutor;
}

export interface SpawnRequest {
  tasks: Array<{
    id: string;
    description: string;
    input: Record<string, unknown>;
    modelTier?: "fast" | "balanced" | "deep";
  }>;
  strategy?: "parallel" | "sequential" | "adaptive";
}

export class SwarmSpawner extends EventEmitter {
  private router: ModelRouter;
  private hedera: HederaIntegration;
  private aggregator: ResultAggregator;
  private config: SwarmConfig;
  private executor: ModelExecutor;
  private tierEnforcer: TierEnforcer;
  private pqcIdentity?: PQCIdentityManager;
  private activeAgents: Map<string, EphemeralAgent> = new Map();

  constructor(config: Partial<SwarmConfig> = {}) {
    super();
    this.config = {
      maxParallel: config.maxParallel ?? 5,
      timeout: config.timeout ?? 120000,
      retryAttempts: config.retryAttempts ?? 2,
      retryDelay: config.retryDelay ?? 1000,
      enableAuditTrail: config.enableAuditTrail ?? true,
      hederaNetwork: config.hederaNetwork ?? "testnet",
      pqcKeyPair: config.pqcKeyPair,
      pqcIdentity: config.pqcIdentity,
      licenseKey: config.licenseKey,
      executor: config.executor,
    };
    this.executor = config.executor ?? defaultExecutor;
    this.tierEnforcer = new TierEnforcer(config.licenseKey);
    if (config.pqcIdentity) {
      this.pqcIdentity = new PQCIdentityManager(config.pqcIdentity);
    }
    this.router = new ModelRouter();
    this.hedera = new HederaIntegration(this.config.hederaNetwork);
    this.aggregator = new ResultAggregator();
  }

  /** Returns the active license tier. */
  getTier(): Tier {
    return this.tierEnforcer.getTier();
  }

  async spawn(request: SpawnRequest): Promise<AggregatedResult> {
    this.activeAgents.clear();
    const swarmId = `swarm-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const startTime = Date.now();
    const auditEntries: AuditEntry[] = [];

    // 1. ENFORCE — check tier limits before any work
    this.tierEnforcer.enforce({
      type: "agentCount",
      count: request.tasks.length,
    });
    this.tierEnforcer.enforce({
      type: "network",
      network: this.config.hederaNetwork,
    });
    if (this.pqcIdentity) {
      this.tierEnforcer.enforce({ type: "pqcSigning" });
    }

    if (this.config.enableAuditTrail) {
      const entry = await this.hedera.logSwarmStart({
        taskCount: request.tasks.length,
        strategy: request.strategy ?? "parallel",
        timestamp: new Date().toISOString(),
      });
      auditEntries.push(entry);
    }

    const agents = await this.routeAndSpawn(request.tasks, swarmId);

    if (request.strategy === "sequential") {
      await this.runSequential(agents, auditEntries, swarmId);
    } else {
      await this.runParallel(agents, auditEntries, swarmId);
    }

    const result = this.aggregator.aggregate(
      Array.from(this.activeAgents.values()),
    );

    if (this.config.enableAuditTrail) {
      await this.hedera.logSwarmComplete({
        ...result,
        duration: Date.now() - startTime,
        auditEntries,
      });
    }

    this.emit("complete", result);
    return result;
  }

  private async routeAndSpawn(
    tasks: SpawnRequest["tasks"],
    swarmId: string,
  ): Promise<EphemeralAgent[]> {
    return tasks.map((task) => {
      // Enforce model tier limits
      const tier = task.modelTier ?? "balanced";
      this.tierEnforcer.enforce({ type: "modelTier", modelTier: tier });

      const model = this.router.selectModel(tier);
      const agent: EphemeralAgent = {
        id: `agent-${Date.now()}-${crypto.randomUUID().slice(0, 12)}`,
        task: task.description,
        model,
        input: task.input,
        status: "pending",
        createdAt: new Date(),
      };

      // 2. CERTIFY BIRTH — PQC-sign agent creation
      if (this.pqcIdentity) {
        agent.birthCertificate = this.pqcIdentity.issueBirthCertificate(
          agent,
          swarmId,
        );
        this.emit("agent:certified", {
          agentId: agent.id,
          type: "birth",
          algorithm: "ML-DSA-65",
        });
      }

      this.activeAgents.set(agent.id, agent);
      return agent;
    });
  }

  private async runParallel(
    agents: EphemeralAgent[],
    auditEntries: AuditEntry[],
    swarmId: string,
  ): Promise<void> {
    const chunks = this.chunkArray(agents, this.config.maxParallel);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((agent) => this.executeAgent(agent, auditEntries, swarmId)),
      );
    }
  }

  private async runSequential(
    agents: EphemeralAgent[],
    auditEntries: AuditEntry[],
    swarmId: string,
  ): Promise<void> {
    for (const agent of agents) {
      await this.executeAgent(agent, auditEntries, swarmId);
    }
  }

  private async executeAgent(
    agent: EphemeralAgent,
    auditEntries: AuditEntry[],
    swarmId?: string,
  ): Promise<void> {
    agent.status = "running";
    this.emit("agent:start", agent);

    try {
      // 3. EXECUTE — run the pluggable model executor
      const result = await this.executeWithTimeout(agent);
      agent.output = result;
      agent.status = "completed";
      agent.completedAt = new Date();

      // Legacy audit path (deprecated pqcKeyPair)
      if (
        this.config.enableAuditTrail &&
        this.config.pqcKeyPair &&
        !this.pqcIdentity
      ) {
        const entry = await this.hedera.signAndLog(
          agent,
          this.config.pqcKeyPair,
        );
        auditEntries.push(entry);
      }
    } catch (error) {
      agent.status = "failed";
      agent.error = error instanceof Error ? error.message : String(error);
      agent.completedAt = new Date();
    }

    // 4. CERTIFY DEATH — PQC-sign agent completion/failure
    if (this.pqcIdentity && swarmId) {
      agent.deathCertificate = this.pqcIdentity.issueDeathCertificate(
        agent,
        swarmId,
      );
      this.emit("agent:certified", {
        agentId: agent.id,
        type: "death",
        status: agent.status,
        algorithm: "ML-DSA-65",
      });
    }

    this.emit("agent:complete", agent);
  }

  private async executeWithTimeout(agent: EphemeralAgent): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Agent ${agent.id} timed out`)),
        this.config.timeout,
      );

      this.invokeModel(agent)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async invokeModel(agent: EphemeralAgent): Promise<unknown> {
    this.emit("agent:model:start", {
      agentId: agent.id,
      model: agent.model,
      timestamp: new Date().toISOString(),
    });

    const result = await this.executor(agent, agent.model);

    this.emit("agent:model:complete", {
      agentId: agent.id,
      model: agent.model,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  getActiveAgents(): EphemeralAgent[] {
    return Array.from(this.activeAgents.values());
  }

  destroy(): void {
    this.activeAgents.clear();
  }
}
