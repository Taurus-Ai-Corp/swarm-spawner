import type { EphemeralAgent } from "./spawner.js";

export interface AggregatedResult {
  totalAgents: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  totalDuration: number;
  results: Array<{
    agentId: string;
    status: string;
    output?: unknown;
    error?: string;
    duration: number;
  }>;
  errors: Array<{
    agentId: string;
    error: string;
  }>;
}

export class ResultAggregator {
  aggregate(agents: EphemeralAgent[]): AggregatedResult {
    const successCount = agents.filter((a) => a.status === "completed").length;
    const failureCount = agents.filter((a) => a.status === "failed").length;

    const results = agents.map((agent) => ({
      agentId: agent.id,
      status: agent.status,
      output: agent.output,
      error: agent.error,
      duration:
        agent.completedAt && agent.createdAt
          ? agent.completedAt.getTime() - agent.createdAt.getTime()
          : 0,
    }));

    const errors = agents
      .filter((a) => a.status === "failed")
      .map((a) => ({ agentId: a.id, error: a.error ?? "Unknown error" }));

    return {
      totalAgents: agents.length,
      successCount,
      failureCount,
      successRate: agents.length > 0 ? successCount / agents.length : 0,
      totalDuration: agents.reduce((sum, a) => {
        if (a.completedAt && a.createdAt) {
          return sum + (a.completedAt.getTime() - a.createdAt.getTime());
        }
        return sum;
      }, 0),
      results,
      errors,
    };
  }

  mergeResults(results: AggregatedResult[]): AggregatedResult {
    return {
      totalAgents: results.reduce((sum, r) => sum + r.totalAgents, 0),
      successCount: results.reduce((sum, r) => sum + r.successCount, 0),
      failureCount: results.reduce((sum, r) => sum + r.failureCount, 0),
      successRate:
        results.reduce((sum, r) => sum + r.totalAgents, 0) > 0
          ? results.reduce((sum, r) => sum + r.successCount, 0) /
            results.reduce((sum, r) => sum + r.totalAgents, 0)
          : 0,
      totalDuration: results.reduce((sum, r) => sum + r.totalDuration, 0),
      results: results.flatMap((r) => r.results),
      errors: results.flatMap((r) => r.errors),
    };
  }
}
