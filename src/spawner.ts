import { EventEmitter } from "events";
import { ModelRouter, ModelConfig } from "./model-router.js";
import { HederaIntegration, AuditEntry } from "./hedera-integration.js";
import { ResultAggregator, AggregatedResult } from "./result-aggregator.js";

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
}

export interface SwarmConfig {
  maxParallel: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableAuditTrail: boolean;
  hederaNetwork: "testnet" | "mainnet";
  pqcKeyPair?: {
    publicKey: string;
    privateKey: string;
  };
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
    };
    this.router = new ModelRouter();
    this.hedera = new HederaIntegration(this.config.hederaNetwork);
    this.aggregator = new ResultAggregator();
  }

  async spawn(request: SpawnRequest): Promise<AggregatedResult> {
    const startTime = Date.now();
    const auditEntries: AuditEntry[] = [];

    if (this.config.enableAuditTrail) {
      const entry = await this.hedera.logSwarmStart({
        taskCount: request.tasks.length,
        strategy: request.strategy ?? "parallel",
        timestamp: new Date().toISOString(),
      });
      auditEntries.push(entry);
    }

    const agents = await this.routeAndSpawn(request.tasks);

    if (request.strategy === "sequential") {
      await this.runSequential(agents, auditEntries);
    } else {
      await this.runParallel(agents, auditEntries);
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
  ): Promise<EphemeralAgent[]> {
    return tasks.map((task) => {
      const model = this.router.selectModel(task.modelTier ?? "balanced");
      const agent: EphemeralAgent = {
        id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        task: task.description,
        model,
        input: task.input,
        status: "pending",
        createdAt: new Date(),
      };
      this.activeAgents.set(agent.id, agent);
      return agent;
    });
  }

  private async runParallel(
    agents: EphemeralAgent[],
    auditEntries: AuditEntry[],
  ): Promise<void> {
    const chunks = this.chunkArray(agents, this.config.maxParallel);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((agent) => this.executeAgent(agent, auditEntries)),
      );
    }
  }

  private async runSequential(
    agents: EphemeralAgent[],
    auditEntries: AuditEntry[],
  ): Promise<void> {
    for (const agent of agents) {
      await this.executeAgent(agent, auditEntries);
    }
  }

  private async executeAgent(
    agent: EphemeralAgent,
    auditEntries: AuditEntry[],
  ): Promise<void> {
    agent.status = "running";
    this.emit("agent:start", agent);

    try {
      const result = await this.executeWithTimeout(agent);
      agent.output = result;
      agent.status = "completed";
      agent.completedAt = new Date();

      if (this.config.enableAuditTrail && this.config.pqcKeyPair) {
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
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { agentId: agent.id, result: `Processed: ${agent.task}` };
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

export { ModelRouter, HederaIntegration, ResultAggregator };
