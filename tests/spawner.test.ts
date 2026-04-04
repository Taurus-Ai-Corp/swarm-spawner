import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SwarmSpawner } from "../src/spawner.js";
import type { ModelExecutor, EphemeralAgent } from "../src/spawner.js";
import type { ModelConfig } from "../src/model-router.js";

describe("SwarmSpawner", () => {
  let spawner: SwarmSpawner;

  beforeEach(() => {
    spawner = new SwarmSpawner({
      maxParallel: 5,
      timeout: 5000,
      enableAuditTrail: false,
    });
  });

  afterEach(() => {
    spawner.destroy();
  });

  it("should spawn agents for tasks", async () => {
    const result = await spawner.spawn({
      tasks: [
        {
          id: "task-1",
          description: "Test task 1",
          input: {},
          modelTier: "fast",
        },
        {
          id: "task-2",
          description: "Test task 2",
          input: {},
          modelTier: "fast",
        },
      ],
      strategy: "parallel",
    });

    expect(result.totalAgents).toBe(2);
    expect(result.successCount).toBeGreaterThanOrEqual(0);
  });

  it("should execute in parallel by default", async () => {
    const result = await spawner.spawn({
      tasks: [
        { id: "task-1", description: "Task 1", input: {}, modelTier: "fast" },
        { id: "task-2", description: "Task 2", input: {}, modelTier: "fast" },
        { id: "task-3", description: "Task 3", input: {}, modelTier: "fast" },
      ],
      strategy: "parallel",
    });
    expect(result.totalAgents).toBe(3);
  });

  it("should respect maxParallel config", async () => {
    const spawnerLimited = new SwarmSpawner({
      maxParallel: 1,
      timeout: 5000,
      enableAuditTrail: false,
    });

    const result = await spawnerLimited.spawn({
      tasks: [
        { id: "task-1", description: "Task 1", input: {}, modelTier: "fast" },
        { id: "task-2", description: "Task 2", input: {}, modelTier: "fast" },
      ],
      strategy: "parallel",
    });

    expect(result.totalAgents).toBe(2);
    spawnerLimited.destroy();
  });

  it("should emit events", async () => {
    let startCount = 0;
    let completeCount = 0;

    spawner.on("agent:start", () => startCount++);
    spawner.on("agent:complete", () => completeCount++);

    await spawner.spawn({
      tasks: [
        { id: "task-1", description: "Task", input: {}, modelTier: "fast" },
      ],
      strategy: "parallel",
    });

    expect(startCount).toBe(1);
    expect(completeCount).toBe(1);
  });

  it("should return correct success rate", async () => {
    const result = await spawner.spawn({
      tasks: [
        { id: "task-1", description: "Task 1", input: {}, modelTier: "fast" },
        { id: "task-2", description: "Task 2", input: {}, modelTier: "fast" },
      ],
      strategy: "parallel",
    });

    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });
});

describe("ModelRouter", () => {
  it("should select models by tier", async () => {
    const { ModelRouter } = await import("../src/model-router.js");
    const router = new ModelRouter();

    const fast = router.selectModel("fast");
    expect(fast.provider).toBeDefined();

    const deep = router.selectModel("deep");
    expect(deep.provider).toBeDefined();
  });

  it("should use round robin selection", async () => {
    const { ModelRouter } = await import("../src/model-router.js");
    const router = new ModelRouter();

    const models = new Set();
    for (let i = 0; i < 5; i++) {
      models.add(router.selectModel("fast").model);
    }
    expect(models.size).toBeGreaterThan(1);
  });
});

describe("HederaIntegration", () => {
  it("should create audit entries", async () => {
    const { HederaIntegration } = await import(
      "../src/hedera-integration.js"
    );
    const hedera = new HederaIntegration("testnet");

    const entry = await hedera.logSwarmStart({
      taskCount: 5,
      strategy: "parallel",
      timestamp: new Date().toISOString(),
    });

    expect(entry.action).toBe("SWARM_START");
    expect(entry.agentId).toBe("swarm-coordinator");
  });
});

// ---------------------------------------------------------------------------
// ModelExecutor integration tests
// ---------------------------------------------------------------------------

describe("ModelExecutor — pluggable executor", () => {
  it("default executor returns echo result", async () => {
    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      // no executor provided — uses defaultExecutor
    });

    const result = await spawner.spawn({
      tasks: [
        {
          id: "echo-1",
          description: "Say hello",
          input: { greeting: "hi" },
          modelTier: "fast",
        },
      ],
      strategy: "parallel",
    });

    expect(result.totalAgents).toBe(1);
    expect(result.successCount).toBe(1);

    const agentResult = result.results[0];
    expect(agentResult.status).toBe("completed");
    expect(agentResult.output).toEqual(
      expect.objectContaining({
        result: "Processed: Say hello",
      }),
    );
    // agentId is dynamic — just verify shape
    expect(
      (agentResult.output as { agentId: string }).agentId,
    ).toMatch(/^agent-/);

    spawner.destroy();
  });

  it("custom executor is called with correct agent and model config", async () => {
    const executorSpy = vi.fn<
      Parameters<ModelExecutor>,
      ReturnType<ModelExecutor>
    >(async (agent: EphemeralAgent, config: ModelConfig) => {
      return {
        custom: true,
        taskEcho: agent.task,
        provider: config.provider,
      };
    });

    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      executor: executorSpy,
    });

    const result = await spawner.spawn({
      tasks: [
        {
          id: "custom-1",
          description: "Custom task",
          input: { key: "value" },
          modelTier: "fast",
        },
      ],
      strategy: "parallel",
    });

    // executor was invoked exactly once
    expect(executorSpy).toHaveBeenCalledOnce();

    // verify the arguments passed to the executor
    const [agentArg, configArg] = executorSpy.mock.calls[0];
    expect(agentArg.task).toBe("Custom task");
    expect(agentArg.input).toEqual({ key: "value" });
    expect(configArg.provider).toBeDefined();
    expect(configArg.model).toBeDefined();

    // verify the custom result was stored
    expect(result.successCount).toBe(1);
    const output = result.results[0].output as {
      custom: boolean;
      taskEcho: string;
      provider: string;
    };
    expect(output.custom).toBe(true);
    expect(output.taskEcho).toBe("Custom task");

    spawner.destroy();
  });

  it("executor timeout triggers agent failure", async () => {
    const hangingExecutor: ModelExecutor = async () => {
      // never resolves within the timeout
      return new Promise((resolve) => {
        setTimeout(() => resolve({ late: true }), 60000);
      });
    };

    const spawner = new SwarmSpawner({
      timeout: 100, // very short timeout
      enableAuditTrail: false,
      executor: hangingExecutor,
    });

    const result = await spawner.spawn({
      tasks: [
        {
          id: "timeout-1",
          description: "Will timeout",
          input: {},
          modelTier: "fast",
        },
      ],
      strategy: "parallel",
    });

    expect(result.failureCount).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain("timed out");

    spawner.destroy();
  });

  it("executor error is caught and agent status set to failed", async () => {
    const failingExecutor: ModelExecutor = async () => {
      throw new Error("Model provider unavailable");
    };

    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      executor: failingExecutor,
    });

    const result = await spawner.spawn({
      tasks: [
        {
          id: "fail-1",
          description: "Will fail",
          input: {},
          modelTier: "fast",
        },
      ],
      strategy: "parallel",
    });

    expect(result.failureCount).toBe(1);
    expect(result.successCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Model provider unavailable");

    // The agent in results should show failed status
    expect(result.results[0].status).toBe("failed");
    expect(result.results[0].error).toBe("Model provider unavailable");

    spawner.destroy();
  });

  it("emits agent:model:start and agent:model:complete events", async () => {
    const modelStartEvents: Array<{
      agentId: string;
      model: ModelConfig;
      timestamp: string;
    }> = [];
    const modelCompleteEvents: Array<{
      agentId: string;
      model: ModelConfig;
      timestamp: string;
    }> = [];

    const customExecutor: ModelExecutor = async (agent) => {
      return { done: true, task: agent.task };
    };

    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      executor: customExecutor,
    });

    spawner.on("agent:model:start", (evt) => modelStartEvents.push(evt));
    spawner.on("agent:model:complete", (evt) =>
      modelCompleteEvents.push(evt),
    );

    await spawner.spawn({
      tasks: [
        {
          id: "evt-1",
          description: "Event test A",
          input: {},
          modelTier: "fast",
        },
        {
          id: "evt-2",
          description: "Event test B",
          input: {},
          modelTier: "fast",
        },
      ],
      strategy: "sequential",
    });

    // Two agents -> two start events, two complete events
    expect(modelStartEvents).toHaveLength(2);
    expect(modelCompleteEvents).toHaveLength(2);

    // Each event carries agentId, model, and ISO timestamp
    for (const evt of modelStartEvents) {
      expect(evt.agentId).toMatch(/^agent-/);
      expect(evt.model).toBeDefined();
      expect(evt.model.provider).toBeDefined();
      expect(evt.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }

    for (const evt of modelCompleteEvents) {
      expect(evt.agentId).toMatch(/^agent-/);
      expect(evt.model).toBeDefined();
      expect(evt.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }

    // start events fired before their corresponding complete events
    expect(
      new Date(modelStartEvents[0].timestamp).getTime(),
    ).toBeLessThanOrEqual(
      new Date(modelCompleteEvents[0].timestamp).getTime(),
    );

    spawner.destroy();
  });
});

// ---------------------------------------------------------------------------
// Full lifecycle: PQC + Tier + Spawn integration
// ---------------------------------------------------------------------------

describe("Full lifecycle — PQC identity + tier enforcement", () => {
  /** Create a test JWT for Pro tier */
  function proLicenseKey(): string {
    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const body = btoa(
      JSON.stringify({
        tier: "pro",
        org: "test-org",
        exp: Math.floor(Date.now() / 1000) + 3600,
        features: ["audit-export"],
      }),
    );
    return `${header}.${body}.nosig`;
  }

  it("issues birth + death certificates for each agent", async () => {
    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      licenseKey: proLicenseKey(),
      pqcIdentity: { masterSeed: new Uint8Array(32).fill(99) },
    });

    const certEvents: Array<{ agentId: string; type: string }> = [];
    spawner.on("agent:certified", (evt) => certEvents.push(evt));

    const result = await spawner.spawn({
      tasks: [
        { id: "pqc-1", description: "Task A", input: {}, modelTier: "deep" },
        { id: "pqc-2", description: "Task B", input: {}, modelTier: "balanced" },
      ],
      strategy: "sequential",
    });

    expect(result.totalAgents).toBe(2);
    expect(result.successCount).toBe(2);

    // 2 birth + 2 death = 4 cert events
    expect(certEvents).toHaveLength(4);
    expect(certEvents.filter((e) => e.type === "birth")).toHaveLength(2);
    expect(certEvents.filter((e) => e.type === "death")).toHaveLength(2);

    spawner.destroy();
  });

  it("birth + death certificates are verifiable", async () => {
    const { PQCIdentityManager } = await import("../src/pqc-identity.js");

    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      licenseKey: proLicenseKey(),
      pqcIdentity: { masterSeed: new Uint8Array(32).fill(77) },
    });

    const result = await spawner.spawn({
      tasks: [
        { id: "verify-1", description: "Verifiable task", input: {}, modelTier: "fast" },
      ],
      strategy: "parallel",
    });

    const agents = spawner.getActiveAgents();
    const agent = agents[0];

    expect(agent.birthCertificate).toBeDefined();
    expect(agent.deathCertificate).toBeDefined();
    expect(PQCIdentityManager.verify(agent.birthCertificate!)).toBe(true);
    expect(PQCIdentityManager.verify(agent.deathCertificate!)).toBe(true);

    spawner.destroy();
  });

  it("free tier blocks balanced/deep model tiers", async () => {
    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      // no licenseKey = free tier
    });

    await expect(
      spawner.spawn({
        tasks: [
          { id: "blocked-1", description: "Will be blocked", input: {}, modelTier: "deep" },
        ],
      }),
    ).rejects.toThrow("not available on free tier");

    spawner.destroy();
  });

  it("free tier blocks PQC signing", async () => {
    expect(
      () =>
        new SwarmSpawner({
          timeout: 5000,
          enableAuditTrail: false,
          pqcIdentity: { masterSeed: new Uint8Array(32).fill(1) },
          // no licenseKey = free tier → PQC blocked
        }),
    ).not.toThrow(); // constructor doesn't throw

    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      pqcIdentity: { masterSeed: new Uint8Array(32).fill(1) },
    });

    await expect(
      spawner.spawn({
        tasks: [
          { id: "pqc-blocked", description: "PQC blocked", input: {}, modelTier: "fast" },
        ],
      }),
    ).rejects.toThrow("PQC signing is not available on free tier");

    spawner.destroy();
  });

  it("pro tier allows all model tiers + PQC", async () => {
    const spawner = new SwarmSpawner({
      timeout: 5000,
      enableAuditTrail: false,
      licenseKey: proLicenseKey(),
      pqcIdentity: { masterSeed: new Uint8Array(32).fill(42) },
    });

    const result = await spawner.spawn({
      tasks: [
        { id: "pro-1", description: "Fast", input: {}, modelTier: "fast" },
        { id: "pro-2", description: "Balanced", input: {}, modelTier: "balanced" },
        { id: "pro-3", description: "Deep", input: {}, modelTier: "deep" },
      ],
      strategy: "parallel",
    });

    expect(result.totalAgents).toBe(3);
    expect(result.successCount).toBe(3);
    expect(spawner.getTier()).toBe("pro");

    spawner.destroy();
  });
});
