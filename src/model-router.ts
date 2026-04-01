export interface ModelConfig {
  provider: "openai" | "anthropic" | "google" | "ollama" | "groq";
  model: string;
  temperature: number;
  maxTokens: number;
  contextWindow: number;
  cost: "low" | "medium" | "high";
}

export type ModelTier = "fast" | "balanced" | "deep";

const MODEL_REGISTRY: Record<ModelTier, ModelConfig[]> = {
  fast: [
    {
      provider: "groq",
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      maxTokens: 1024,
      contextWindow: 8192,
      cost: "low",
    },
    {
      provider: "ollama",
      model: "qwen3-coder:latest",
      temperature: 0.3,
      maxTokens: 4096,
      contextWindow: 32768,
      cost: "low",
    },
    {
      provider: "google",
      model: "gemini-1.5-flash",
      temperature: 0.3,
      maxTokens: 4096,
      contextWindow: 1000000,
      cost: "low",
    },
  ],
  balanced: [
    {
      provider: "anthropic",
      model: "claude-3-5-haiku-20241022",
      temperature: 0.5,
      maxTokens: 8192,
      contextWindow: 200000,
      cost: "medium",
    },
    {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.5,
      maxTokens: 16384,
      contextWindow: 128000,
      cost: "medium",
    },
    {
      provider: "google",
      model: "gemini-1.5-pro",
      temperature: 0.5,
      maxTokens: 8192,
      contextWindow: 2000000,
      cost: "medium",
    },
  ],
  deep: [
    {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      temperature: 0.7,
      maxTokens: 64000,
      contextWindow: 200000,
      cost: "high",
    },
    {
      provider: "openai",
      model: "gpt-4-turbo",
      temperature: 0.7,
      maxTokens: 32000,
      contextWindow: 128000,
      cost: "high",
    },
    {
      provider: "ollama",
      model: "deepseek-coder-v2:latest",
      temperature: 0.7,
      maxTokens: 16384,
      contextWindow: 65536,
      cost: "high",
    },
  ],
};

export class ModelRouter {
  private lastUsed: Map<ModelTier, number> = new Map();
  private cache: Map<string, ModelConfig> = new Map();

  selectModel(tier: ModelTier): ModelConfig {
    const models = MODEL_REGISTRY[tier];
    const index = this.roundRobinIndex(tier, models.length);
    const model = models[index];
    this.lastUsed.set(tier, index);
    return model;
  }

  selectModelForTask(taskComplexity: number, contextSize: number): ModelConfig {
    if (taskComplexity < 3 && contextSize < 5000) {
      return this.selectModel("fast");
    } else if (taskComplexity < 7 && contextSize < 50000) {
      return this.selectModel("balanced");
    } else {
      return this.selectModel("deep");
    }
  }

  private roundRobinIndex(tier: ModelTier, max: number): number {
    const last = this.lastUsed.get(tier) ?? -1;
    return (last + 1) % max;
  }

  getCachedModel(cacheKey: string): ModelConfig | undefined {
    return this.cache.get(cacheKey);
  }

  cacheModel(cacheKey: string, model: ModelConfig): void {
    this.cache.set(cacheKey, model);
  }

  getModelsByProvider(provider: ModelConfig["provider"]): ModelConfig[] {
    return Object.values(MODEL_REGISTRY)
      .flat()
      .filter((m) => m.provider === provider);
  }
}

export { MODEL_REGISTRY };
