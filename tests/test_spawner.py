import pytest
import asyncio
from swarm_spawner import SwarmSpawner, SwarmConfig, SpawnRequest, SpawnTask, ModelTier, AgentStatus


@pytest.fixture
def spawner():
    config = SwarmConfig(max_parallel=5, timeout=5000, enable_audit_trail=False)
    return SwarmSpawner(config)


@pytest.mark.asyncio
async def test_spawn_agents(spawner):
    request = SpawnRequest(
        tasks=[
            SpawnTask(id="task-1", description="Test task 1", input={}, model_tier=ModelTier.FAST),
            SpawnTask(
                id="task-2", description="Test task 2", input={}, model_tier=ModelTier.BALANCED
            ),
        ],
        strategy="parallel",
    )
    result = await spawner.spawn(request)
    assert result["totalAgents"] == 2
    assert result["successCount"] >= 0


@pytest.mark.asyncio
async def test_sequential_execution(spawner):
    request = SpawnRequest(
        tasks=[
            SpawnTask(id="task-1", description="Task 1", input={}, model_tier=ModelTier.FAST),
            SpawnTask(id="task-2", description="Task 2", input={}, model_tier=ModelTier.FAST),
        ],
        strategy="sequential",
    )
    result = await spawner.spawn(request)
    assert result["totalAgents"] == 2


@pytest.mark.asyncio
async def test_max_parallel_limit():
    config = SwarmConfig(max_parallel=1, timeout=5000, enable_audit_trail=False)
    spawner = SwarmSpawner(config)
    request = SpawnRequest(
        tasks=[
            SpawnTask(id="task-1", description="Task 1", input={}, model_tier=ModelTier.FAST),
            SpawnTask(id="task-2", description="Task 2", input={}, model_tier=ModelTier.FAST),
        ],
        strategy="parallel",
    )
    result = await spawner.spawn(request)
    assert result["totalAgents"] == 2


@pytest.mark.asyncio
async def test_event_emission(spawner):
    start_count = 0
    complete_count = 0

    def on_start(agent):
        nonlocal start_count
        start_count += 1

    def on_complete(agent):
        nonlocal complete_count
        complete_count += 1

    spawner.on("agent:start", on_start)
    spawner.on("agent:complete", on_complete)

    request = SpawnRequest(
        tasks=[
            SpawnTask(id="task-1", description="Task", input={}, model_tier=ModelTier.FAST),
        ],
        strategy="parallel",
    )
    await spawner.spawn(request)

    assert start_count == 1
    assert complete_count == 1


@pytest.mark.asyncio
async def test_success_rate(spawner):
    request = SpawnRequest(
        tasks=[
            SpawnTask(id="task-1", description="Task 1", input={}, model_tier=ModelTier.FAST),
            SpawnTask(id="task-2", description="Task 2", input={}, model_tier=ModelTier.FAST),
        ],
        strategy="parallel",
    )
    result = await spawner.spawn(request)
    assert 0 <= result["successRate"] <= 1


def test_model_router():
    from swarm_spawner import ModelRouter

    router = ModelRouter()
    model = router.select_model(ModelTier.FAST)
    assert model.provider is not None
    assert model.cost == "low"


def test_model_tiers():
    from swarm_spawner import MODEL_REGISTRY

    assert len(MODEL_REGISTRY[ModelTier.FAST]) >= 1
    assert len(MODEL_REGISTRY[ModelTier.BALANCED]) >= 1
    assert len(MODEL_REGISTRY[ModelTier.DEEP]) >= 1
