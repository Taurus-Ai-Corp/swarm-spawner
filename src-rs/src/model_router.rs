use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ModelTier {
    Fast,
    Balanced,
    Deep,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub provider: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub context_window: u32,
    pub cost: String,
}

pub struct ModelRouter {
    last_used: usize,
    cache: std::collections::HashMap<String, ModelConfig>,
}

impl ModelRouter {
    pub fn new() -> Self {
        Self {
            last_used: 0,
            cache: std::collections::HashMap::new(),
        }
    }

    pub fn select_model(&mut self, tier: ModelTier) -> ModelConfig {
        let models = match tier {
            ModelTier::Fast => vec![
                ModelConfig {
                    provider: "groq".to_string(),
                    model: "llama-3.1-8b-instant".to_string(),
                    temperature: 0.3,
                    max_tokens: 1024,
                    context_window: 8192,
                    cost: "low".to_string(),
                },
                ModelConfig {
                    provider: "ollama".to_string(),
                    model: "qwen3-coder:latest".to_string(),
                    temperature: 0.3,
                    max_tokens: 4096,
                    context_window: 32768,
                    cost: "low".to_string(),
                },
                ModelConfig {
                    provider: "google".to_string(),
                    model: "gemini-1.5-flash".to_string(),
                    temperature: 0.3,
                    max_tokens: 4096,
                    context_window: 1000000,
                    cost: "low".to_string(),
                },
            ],
            ModelTier::Balanced => vec![
                ModelConfig {
                    provider: "anthropic".to_string(),
                    model: "claude-3-5-haiku-20241022".to_string(),
                    temperature: 0.5,
                    max_tokens: 8192,
                    context_window: 200000,
                    cost: "medium".to_string(),
                },
                ModelConfig {
                    provider: "openai".to_string(),
                    model: "gpt-4o-mini".to_string(),
                    temperature: 0.5,
                    max_tokens: 16384,
                    context_window: 128000,
                    cost: "medium".to_string(),
                },
                ModelConfig {
                    provider: "google".to_string(),
                    model: "gemini-1.5-pro".to_string(),
                    temperature: 0.5,
                    max_tokens: 8192,
                    context_window: 2000000,
                    cost: "medium".to_string(),
                },
            ],
            ModelTier::Deep => vec![
                ModelConfig {
                    provider: "anthropic".to_string(),
                    model: "claude-sonnet-4-20250514".to_string(),
                    temperature: 0.7,
                    max_tokens: 64000,
                    context_window: 200000,
                    cost: "high".to_string(),
                },
                ModelConfig {
                    provider: "openai".to_string(),
                    model: "gpt-4-turbo".to_string(),
                    temperature: 0.7,
                    max_tokens: 32000,
                    context_window: 128000,
                    cost: "high".to_string(),
                },
                ModelConfig {
                    provider: "ollama".to_string(),
                    model: "deepseek-coder-v2:latest".to_string(),
                    temperature: 0.7,
                    max_tokens: 16384,
                    context_window: 65536,
                    cost: "high".to_string(),
                },
            ],
        };

        let index = self.round_robin_index(models.len());
        self.last_used = index;
        models.remove(index)
    }

    fn round_robin_index(&self, max: usize) -> usize {
        (self.last_used + 1) % max
    }

    pub fn get_cached_model(&self, cache_key: &str) -> Option<ModelConfig> {
        self.cache.get(cache_key).cloned()
    }

    pub fn cache_model(&mut self, cache_key: &str, model: ModelConfig) {
        self.cache.insert(cache_key.to_string(), model);
    }
}

impl Default for ModelRouter {
    fn default() -> Self {
        Self::new()
    }
}