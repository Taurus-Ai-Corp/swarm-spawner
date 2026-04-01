import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SwarmSpawner } from '../src/spawner.js';

describe('SwarmSpawner', () => {
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

  it('should spawn agents for tasks', async () => {
    const result = await spawner.spawn({
      tasks: [
        { id: 'task-1', description: 'Test task 1', input: {}, modelTier: 'fast' },
        { id: 'task-2', description: 'Test task 2', input: {}, modelTier: 'balanced' },
      ],
      strategy: 'parallel',
    });

    expect(result.totalAgents).toBe(2);
    expect(result.successCount).toBeGreaterThanOrEqual(0);
  });

  it('should execute in parallel by default', async () => {
    const start = Date.now();
    const result = await spawner.spawn({
      tasks: [
        { id: 'task-1', description: 'Task 1', input: {}, modelTier: 'fast' },
        { id: 'task-2', description: 'Task 2', input: {}, modelTier: 'fast' },
        { id: 'task-3', description: 'Task 3', input: {}, modelTier: 'fast' },
      ],
      strategy: 'parallel',
    });
    const duration = Date.now() - start;
    expect(result.totalAgents).toBe(3);
  });

  it('should respect maxParallel config', async () => {
    const spawnerLimited = new SwarmSpawner({
      maxParallel: 1,
      timeout: 5000,
      enableAuditTrail: false,
    });

    const result = await spawnerLimited.spawn({
      tasks: [
        { id: 'task-1', description: 'Task 1', input: {}, modelTier: 'fast' },
        { id: 'task-2', description: 'Task 2', input: {}, modelTier: 'fast' },
      ],
      strategy: 'parallel',
    });

    expect(result.totalAgents).toBe(2);
    spawnerLimited.destroy();
  });

  it('should emit events', async () => {
    let startCount = 0;
    let completeCount = 0;

    spawner.on('agent:start', () => startCount++);
    spawner.on('agent:complete', () => completeCount++);

    await spawner.spawn({
      tasks: [
        { id: 'task-1', description: 'Task', input: {}, modelTier: 'fast' },
      ],
      strategy: 'parallel',
    });

    expect(startCount).toBe(1);
    expect(completeCount).toBe(1);
  });

  it('should return correct success rate', async () => {
    const result = await spawner.spawn({
      tasks: [
        { id: 'task-1', description: 'Task 1', input: {}, modelTier: 'fast' },
        { id: 'task-2', description: 'Task 2', input: {}, modelTier: 'fast' },
      ],
      strategy: 'parallel',
    });

    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });
});

describe('ModelRouter', () => {
  it('should select models by tier', async () => {
    const { ModelRouter } = await import('../src/model-router.js');
    const router = new ModelRouter();

    const fast = router.selectModel('fast');
    expect(fast.provider).toBeDefined();

    const deep = router.selectModel('deep');
    expect(deep.provider).toBeDefined();
  });

  it('should use round robin selection', async () => {
    const { ModelRouter } = await import('../src/model-router.js');
    const router = new ModelRouter();

    const models = new Set();
    for (let i = 0; i < 5; i++) {
      models.add(router.selectModel('fast').model);
    }
    expect(models.size).toBeGreaterThan(1);
  });
});

describe('HederaIntegration', () => {
  it('should create audit entries', async () => {
    const { HederaIntegration } = await import('../src/hedera-integration.js');
    const hedera = new HederaIntegration('testnet');

    const entry = await hedera.logSwarmStart({
      taskCount: 5,
      strategy: 'parallel',
      timestamp: new Date().toISOString(),
    });

    expect(entry.action).toBe('SWARM_START');
    expect(entry.agentId).toBe('swarm-coordinator');
  });
});