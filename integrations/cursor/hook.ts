import { SwarmSpawner } from '../src/spawner.js';
import type { SwarmConfig, SpawnRequest } from '../src/spawner.js';

export interface CursorHookConfig {
  modelPreference?: 'claude' | 'openai' | 'auto';
  maxAgents?: number;
  timeout?: number;
  enableAuditTrail?: boolean;
}

export class CursorSwarmHook {
  private spawner: SwarmSpawner;
  private config: CursorHookConfig;

  constructor(config: CursorHookConfig = {}) {
    const swarmConfig: Partial<SwarmConfig> = {
      maxParallel: config.maxAgents ?? 5,
      timeout: config.timeout ?? 120000,
      enableAuditTrail: config.enableAuditTrail ?? true,
      hederaNetwork: 'testnet',
    };

    this.spawner = new SwarmSpawner(swarmConfig);
    this.config = config;
  }

  async executeSwarmCommand(command: string, files: string[]): Promise<unknown> {
    const subtasks = this.decomposeCommand(command, files);

    const request: SpawnRequest = {
      tasks: subtasks.map((task, idx) => ({
        id: `subtask-${idx}`,
        description: task,
        input: { files },
        modelTier: this.determineTier(task),
      })),
      strategy: subtasks.length > 3 ? 'parallel' : 'sequential',
    };

    return this.spawner.spawn(request);
  }

  private decomposeCommand(command: string, files: string[]): string[] {
    const lower = command.toLowerCase();
    const subtasks: string[] = [];

    if (lower.includes('refactor')) {
      subtasks.push(`Refactor ${files.join(', ')}`);
    }
    if (lower.includes('test')) {
      subtasks.push(`Generate tests for ${files.join(', ')}`);
    }
    if (lower.includes('review') || lower.includes('audit')) {
      subtasks.push(`Review code in ${files.join(', ')}`);
    }
    if (lower.includes('doc')) {
      subtasks.push(`Document ${files.join(', ')}`);
    }

    return subtasks.length > 0 ? subtasks : [command];
  }

  private determineTier(task: string): 'fast' | 'balanced' | 'deep' {
    const complexKeywords = ['refactor', 'architect', 'design', 'security'];
    const fastKeywords = ['check', 'list', 'simple', 'quick'];

    const lower = task.toLowerCase();
    if (complexKeywords.some(k => lower.includes(k))) return 'deep';
    if (fastKeywords.some(k => lower.includes(k))) return 'fast';
    return 'balanced';
  }

  destroy(): void {
    this.spawner.destroy();
  }
}

export function createCursorHook(config?: CursorHookConfig): CursorSwarmHook {
  return new CursorSwarmHook(config);
}