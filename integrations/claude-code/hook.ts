import { SwarmSpawner } from './spawner.js';
import type { SwarmConfig, SpawnRequest } from './spawner.js';

export interface ClaudeCodeHookConfig {
  modelPreference?: 'claude' | 'openai' | 'auto';
  maxAgents?: number;
  timeout?: number;
  enableAuditTrail?: boolean;
}

export class ClaudeCodeSwarmHook {
  private spawner: SwarmSpawner;
  private config: ClaudeCodeHookConfig;

  constructor(config: ClaudeCodeHookConfig = {}) {
    const swarmConfig: Partial<SwarmConfig> = {
      maxParallel: config.maxAgents ?? 5,
      timeout: config.timeout ?? 120000,
      enableAuditTrail: config.enableAuditTrail ?? true,
      hederaNetwork: 'testnet',
    };

    this.spawner = new SwarmSpawner(swarmConfig);
    this.config = config;
  }

  async executeSwarmCommand(command: string, context: Record<string, unknown>): Promise<unknown> {
    const subtasks = this.decomposeCommand(command, context);

    const request: SpawnRequest = {
      tasks: subtasks.map((task, idx) => ({
        id: `subtask-${idx}`,
        description: task,
        input: context,
        modelTier: this.determineTier(task),
      })),
      strategy: subtasks.length > 3 ? 'parallel' : 'sequential',
    };

    const result = await this.spawner.spawn(request);
    return this.formatResult(result);
  }

  private decomposeCommand(command: string, context: Record<string, unknown>): string[] {
    const subtasks: string[] = [];
    
    const keywords = ['analyze', 'generate', 'review', 'test', 'refactor', 'document', 'deploy'];
    const found = keywords.filter(k => command.toLowerCase().includes(k));
    
    if (found.length > 0) {
      subtasks.push(...found.map(k => `${k} ${context['target'] ?? 'target'}`));
    } else {
      subtasks.push(command);
    }

    return subtasks.length > 0 ? subtasks : [command];
  }

  private determineTier(task: string): 'fast' | 'balanced' | 'deep' {
    const complexKeywords = ['architect', 'design', 'refactor', 'security', 'optimize'];
    const fastKeywords = ['check', 'list', 'simple', 'quick'];

    const lower = task.toLowerCase();
    if (complexKeywords.some(k => lower.includes(k))) return 'deep';
    if (fastKeywords.some(k => lower.includes(k))) return 'fast';
    return 'balanced';
  }

  private formatResult(result: any): string {
    return `Swarm complete: ${result.successCount}/${result.totalAgents} tasks succeeded (${Math.round(result.successRate * 100)}% success rate)`;
  }

  destroy(): void {
    this.spawner.destroy();
  }
}

export function createSwarmHook(config?: ClaudeCodeHookConfig): ClaudeCodeSwarmHook {
  return new ClaudeCodeSwarmHook(config);
}

export { SwarmSpawner };
export type { SwarmConfig, SpawnRequest };