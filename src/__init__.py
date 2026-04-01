"""
Swarm Spawner - Python SDK
Ephemeral AI agent orchestration with Hedera blockchain auditability
"""

from __future__ import annotations

import asyncio
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Optional
from event_emitter import Emitter


class ModelTier(str, Enum):
    FAST = "fast"
    BALANCED = "balanced"
    DEEP = "deep"


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Network(str, Enum):
    TESTNET = "testnet"
    MAINNET = "mainnet"


@dataclass
class ModelConfig:
    provider: str
    model: str
    temperature: float
    max_tokens: int
    context_window: int
    cost: str


MODEL_REGISTRY = {
    ModelTier.FAST: [
        ModelConfig("groq", "llama-3.1-8b-instant", 0.3, 1024, 8192, "low"),
        ModelConfig("ollama", "qwen3-coder:latest", 0.3, 4096, 32768, "low"),
        ModelConfig("google", "gemini-1.5-flash", 0.3, 4096, 1000000, "low"),
    ],
    ModelTier.BALANCED: [
        ModelConfig(
            "anthropic", "claude-3-5-haiku-20241022", 0.5, 8192, 200000, "medium"
        ),
        ModelConfig("openai", "gpt-4o-mini", 0.5, 16384, 128000, "medium"),
        ModelConfig("google", "gemini-1.5-pro", 0.5, 8192, 2000000, "medium"),
    ],
    ModelTier.DEEP: [
        ModelConfig(
            "anthropic", "claude-sonnet-4-20250514", 0.7, 64000, 200000, "high"
        ),
        ModelConfig("openai", "gpt-4-turbo", 0.7, 32000, 128000, "high"),
        ModelConfig("ollama", "deepseek-coder-v2:latest", 0.7, 16384, 65536, "high"),
    ],
}


class ModelRouter:
    def __init__(self):
        self._last_used: dict[ModelTier, int] = {}
        self._cache: dict[str, ModelConfig] = {}

    def select_model(self, tier: ModelTier) -> ModelConfig:
        models = MODEL_REGISTRY[tier]
        index = self._round_robin_index(tier, len(models))
        model = models[index]
        self._last_used[tier] = index
        return model

    def _round_robin_index(self, tier: ModelTier, max: int) -> int:
        last = self._last_used.get(tier, -1)
        return (last + 1) % max

    def get_cached_model(self, cache_key: str) -> Optional[ModelConfig]:
        return self._cache.get(cache_key)

    def cache_model(self, cache_key: str, model: ModelConfig) -> None:
        self._cache[cache_key] = model


@dataclass
class EphemeralAgent:
    id: str
    task: str
    model: ModelConfig
    input: dict[str, Any]
    output: Optional[Any] = None
    status: AgentStatus = AgentStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


@dataclass
class AuditEntry:
    id: str
    timestamp: str
    agent_id: str
    action: str
    payload: str
    signature: Optional[str] = None
    topic_id: Optional[str] = None
    sequence_number: Optional[int] = None


class HederaIntegration:
    def __init__(self, network: Network = Network.TESTNET):
        self.network = network
        self._topic_id: Optional[str] = None

    async def log_swarm_start(self, data: dict) -> AuditEntry:
        return AuditEntry(
            id=f"audit-{datetime.now().timestamp()}",
            timestamp=data.get("timestamp", datetime.now().isoformat()),
            agent_id="swarm-coordinator",
            action="SWARM_START",
            payload=json.dumps(data),
        )

    async def log_swarm_complete(self, data: dict) -> AuditEntry:
        return AuditEntry(
            id=f"audit-{datetime.now().timestamp()}",
            timestamp=datetime.now().isoformat(),
            agent_id="swarm-coordinator",
            action="SWARM_COMPLETE",
            payload=json.dumps(data),
        )

    async def sign_and_log(self, agent: EphemeralAgent, key_pair: dict) -> AuditEntry:
        payload = json.dumps(
            {
                "agentId": agent.id,
                "task": agent.task,
                "status": agent.status.value,
            }
        )
        return AuditEntry(
            id=f"audit-{datetime.now().timestamp()}-{agent.id}",
            timestamp=datetime.now().isoformat(),
            agent_id=agent.id,
            action="AGENT_COMPLETE",
            payload=payload,
            signature="pqc-signature-placeholder",
        )


class ResultAggregator:
    @staticmethod
    def aggregate(agents: list[EphemeralAgent]) -> dict:
        success_count = sum(1 for a in agents if a.status == AgentStatus.COMPLETED)
        failure_count = sum(1 for a in agents if a.status == AgentStatus.FAILED)

        results = [
            {
                "agentId": a.id,
                "status": a.status.value,
                "output": a.output,
                "error": a.error,
                "duration": (
                    a.completed_at.timestamp() - a.created_at.timestamp() * 1000
                )
                if a.completed_at
                else 0,
            }
            for a in agents
        ]

        return {
            "totalAgents": len(agents),
            "successCount": success_count,
            "failureCount": failure_count,
            "successRate": success_count / len(agents) if agents else 0,
            "totalDuration": sum(r["duration"] for r in results),
            "results": results,
            "errors": [
                {"agentId": a.id, "error": a.error}
                for a in agents
                if a.status == AgentStatus.FAILED
            ],
        }


@dataclass
class SwarmConfig:
    max_parallel: int = 5
    timeout: int = 120000
    retry_attempts: int = 2
    retry_delay: int = 1000
    enable_audit_trail: bool = True
    hedera_network: Network = Network.TESTNET
    pqc_key_pair: Optional[dict] = None


@dataclass
class SpawnTask:
    id: str
    description: str
    input: dict[str, Any]
    model_tier: ModelTier = ModelTier.BALANCED


@dataclass
class SpawnRequest:
    tasks: list[SpawnTask]
    strategy: str = "parallel"


class SwarmSpawner:
    def __init__(self, config: Optional[SwarmConfig] = None):
        self.config = config or SwarmConfig()
        self.router = ModelRouter()
        self.hedera = HederaIntegration(self.config.hedera_network)
        self._active_agents: dict[str, EphemeralAgent] = {}
        self._emitter = Emitter()

    def on(self, event: str, handler: Callable) -> None:
        self._emitter.on(event, handler)

    async def spawn(self, request: SpawnRequest) -> dict:
        start_time = datetime.now()
        audit_entries: list[AuditEntry] = []

        if self.config.enable_audit_trail:
            entry = await self.hedera.log_swarm_start(
                {
                    "taskCount": len(request.tasks),
                    "strategy": request.strategy,
                    "timestamp": start_time.isoformat(),
                }
            )
            audit_entries.append(entry)

        agents = self._route_and_spawn(request.tasks)

        if request.strategy == "sequential":
            await self._run_sequential(agents, audit_entries)
        else:
            await self._run_parallel(agents, audit_entries)

        result = ResultAggregator.aggregate(list(self._active_agents.values()))

        if self.config.enable_audit_trail:
            await self.hedera.log_swarm_complete(
                {
                    **result,
                    "duration": (datetime.now() - start_time).total_seconds() * 1000,
                    "auditEntries": len(audit_entries),
                }
            )

        return result

    def _route_and_spawn(self, tasks: list[SpawnTask]) -> list[EphemeralAgent]:
        agents = []
        for task in tasks:
            model = self.router.select_model(task.model_tier)
            agent = EphemeralAgent(
                id=f"agent-{uuid.uuid4().hex[:9]}",
                task=task.description,
                model=model,
                input=task.input,
                status=AgentStatus.PENDING,
            )
            self._active_agents[agent.id] = agent
            agents.append(agent)
        return agents

    async def _run_parallel(
        self, agents: list[EphemeralAgent], audit_entries: list[AuditEntry]
    ) -> None:
        chunks = [
            agents[i : i + self.config.max_parallel]
            for i in range(0, len(agents), self.config.max_parallel)
        ]
        for chunk in asyncio.gather(
            *[self._execute_agent(a, audit_entries) for a in chunk]
        ):
            pass

    async def _run_sequential(
        self, agents: list[EphemeralAgent], audit_entries: list[AuditEntry]
    ) -> None:
        for agent in agents:
            await self._execute_agent(agent, audit_entries)

    async def _execute_agent(
        self, agent: EphemeralAgent, audit_entries: list[AuditEntry]
    ) -> None:
        agent.status = AgentStatus.RUNNING
        self._emitter.emit("agent:start", agent)

        try:
            result = await asyncio.wait_for(
                self._invoke_model(agent), timeout=self.config.timeout / 1000
            )
            agent.output = result
            agent.status = AgentStatus.COMPLETED
            agent.completed_at = datetime.now()

            if self.config.enable_audit_trail and self.config.pqc_key_pair:
                entry = await self.hedera.sign_and_log(agent, self.config.pqc_key_pair)
                audit_entries.append(entry)
        except Exception as e:
            agent.status = AgentStatus.FAILED
            agent.error = str(e)
            agent.completed_at = datetime.now()

        self._emitter.emit("agent:complete", agent)

    async def _invoke_model(self, agent: EphemeralAgent) -> Any:
        await asyncio.sleep(0.1)
        return {"agentId": agent.id, "result": f"Processed: {agent.task}"}

    def get_active_agents(self) -> list[EphemeralAgent]:
        return list(self._active_agents.values())

    def destroy(self) -> None:
        self._active_agents.clear()


__all__ = [
    "SwarmSpawner",
    "SwarmConfig",
    "SpawnRequest",
    "SpawnTask",
    "ModelTier",
    "ModelConfig",
    "HederaIntegration",
    "AgentStatus",
    "EphemeralAgent",
]
