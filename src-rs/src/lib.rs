use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub mod model_router;
pub mod hedera_integration;

pub use model_router::{ModelConfig, ModelTier, ModelRouter};
pub use hedera_integration::{AuditEntry, HederaIntegration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Clone)]
pub struct EphemeralAgent {
    pub id: String,
    pub task: String,
    pub model: ModelConfig,
    pub input: HashMap<String, serde_json::Value>,
    pub output: Option<serde_json::Value>,
    pub status: AgentStatus,
    pub created_at: u64,
    pub completed_at: Option<u64>,
    pub error: Option<String>,
}

impl EphemeralAgent {
    pub fn new(id: String, task: String, model: ModelConfig, input: HashMap<String, serde_json::Value>) -> Self {
        Self {
            id,
            task,
            model,
            input,
            output: None,
            status: AgentStatus::Pending,
            created_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            completed_at: None,
            error: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwarmConfig {
    pub max_parallel: usize,
    pub timeout: u64,
    pub retry_attempts: u32,
    pub retry_delay: u64,
    pub enable_audit_trail: bool,
    pub hedera_network: String,
    pub pqc_key_pair: Option<PQCKeyPair>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PQCKeyPair {
    pub public_key: String,
    pub private_key: String,
}

impl Default for SwarmConfig {
    fn default() -> Self {
        Self {
            max_parallel: 5,
            timeout: 120000,
            retry_attempts: 2,
            retry_delay: 1000,
            enable_audit_trail: true,
            hedera_network: "testnet".to_string(),
            pqc_key_pair: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnTask {
    pub id: String,
    pub description: String,
    pub input: HashMap<String, serde_json::Value>,
    pub model_tier: ModelTier,
}

impl SpawnTask {
    pub fn new(id: &str, description: &str, input: HashMap<String, serde_json::Value>) -> Self {
        Self {
            id: id.to_string(),
            description: description.to_string(),
            input,
            model_tier: ModelTier::Balanced,
        }
    }
}

#[derive(Debug, Clone)]
pub struct AggregatedResult {
    pub total_agents: usize,
    pub success_count: usize,
    pub failure_count: usize,
    pub success_rate: f64,
    pub total_duration: u64,
    pub results: Vec<AgentResult>,
    pub errors: Vec<AgentError>,
}

#[derive(Debug, Clone)]
pub struct AgentResult {
    pub agent_id: String,
    pub status: String,
    pub output: Option<serde_json::Value>,
    pub error: Option<String>,
    pub duration: u64,
}

#[derive(Debug, Clone)]
pub struct AgentError {
    pub agent_id: String,
    pub error: String,
}

pub struct ResultAggregator;

impl ResultAggregator {
    pub fn aggregate(agents: &[EphemeralAgent]) -> AggregatedResult {
        let success_count = agents.iter().filter(|a| matches!(a.status, AgentStatus::Completed)).count();
        let failure_count = agents.iter().filter(|a| matches!(a.status, AgentStatus::Failed)).count();
        let total_agents = agents.len();

        let results: Vec<AgentResult> = agents
            .iter()
            .map(|a| {
                let duration = match (a.completed_at, a.created_at) {
                    (Some(complete), start) => complete.saturating_sub(start),
                    _ => 0,
                };
                AgentResult {
                    agent_id: a.id.clone(),
                    status: format!("{:?}", a.status),
                    output: a.output.clone(),
                    error: a.error.clone(),
                    duration,
                }
            })
            .collect();

        let errors: Vec<AgentError> = agents
            .iter()
            .filter(|a| matches!(a.status, AgentStatus::Failed))
            .map(|a| AgentError {
                agent_id: a.id.clone(),
                error: a.error.clone().unwrap_or_else(|| "Unknown error".to_string()),
            })
            .collect();

        let total_duration = results.iter().map(|r| r.duration).sum();

        AggregatedResult {
            total_agents,
            success_count,
            failure_count,
            success_rate: if total_agents > 0 {
                success_count as f64 / total_agents as f64
            } else {
                0.0
            },
            total_duration,
            results,
            errors,
        }
    }
}