package main

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

type ModelTier string

const (
	ModelTierFast     ModelTier = "fast"
	ModelTierBalanced ModelTier = "balanced"
	ModelTierDeep     ModelTier = "deep"
)

type AgentStatus string

const (
	AgentStatusPending   AgentStatus = "pending"
	AgentStatusRunning   AgentStatus = "running"
	AgentStatusCompleted AgentStatus = "completed"
	AgentStatusFailed    AgentStatus = "failed"
)

type ModelConfig struct {
	Provider      string  `json:"provider"`
	Model         string  `json:"model"`
	Temperature   float32 `json:"temperature"`
	MaxTokens     int     `json:"maxTokens"`
	ContextWindow int     `json:"contextWindow"`
	Cost          string  `json:"cost"`
}

var modelRegistry = map[ModelTier][]ModelConfig{
	ModelTierFast: {
		{Provider: "groq", Model: "llama-3.1-8b-instant", Temperature: 0.3, MaxTokens: 1024, ContextWindow: 8192, Cost: "low"},
		{Provider: "ollama", Model: "qwen3-coder:latest", Temperature: 0.3, MaxTokens: 4096, ContextWindow: 32768, Cost: "low"},
		{Provider: "google", Model: "gemini-1.5-flash", Temperature: 0.3, MaxTokens: 4096, ContextWindow: 1000000, Cost: "low"},
	},
	ModelTierBalanced: {
		{Provider: "anthropic", Model: "claude-3-5-haiku-20241022", Temperature: 0.5, MaxTokens: 8192, ContextWindow: 200000, Cost: "medium"},
		{Provider: "openai", Model: "gpt-4o-mini", Temperature: 0.5, MaxTokens: 16384, ContextWindow: 128000, Cost: "medium"},
		{Provider: "google", Model: "gemini-1.5-pro", Temperature: 0.5, MaxTokens: 8192, ContextWindow: 2000000, Cost: "medium"},
	},
	ModelTierDeep: {
		{Provider: "anthropic", Model: "claude-sonnet-4-20250514", Temperature: 0.7, MaxTokens: 64000, ContextWindow: 200000, Cost: "high"},
		{Provider: "openai", Model: "gpt-4-turbo", Temperature: 0.7, MaxTokens: 32000, ContextWindow: 128000, Cost: "high"},
		{Provider: "ollama", Model: "deepseek-coder-v2:latest", Temperature: 0.7, MaxTokens: 16384, ContextWindow: 65536, Cost: "high"},
	},
}

type ModelRouter struct {
	lastUsed int
	cache    map[string]ModelConfig
	mu       sync.Mutex
}

func NewModelRouter() *ModelRouter {
	return &ModelRouter{
		lastUsed: 0,
		cache:    make(map[string]ModelConfig),
	}
}

func (r *ModelRouter) SelectModel(tier ModelTier) ModelConfig {
	r.mu.Lock()
	defer r.mu.Unlock()

	models := modelRegistry[tier]
	index := (r.lastUsed + 1) % len(models)
	r.lastUsed = index
	return models[index]
}

func (r *ModelRouter) GetCachedModel(cacheKey string) (ModelConfig, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	model, ok := r.cache[cacheKey]
	return model, ok
}

func (r *ModelRouter) CacheModel(cacheKey string, model ModelConfig) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cache[cacheKey] = model
}

type EphemeralAgent struct {
	ID          string                 `json:"id"`
	Task        string                 `json:"task"`
	Model       ModelConfig            `json:"model"`
	Input       map[string]interface{} `json:"input"`
	Output      interface{}            `json:"output,omitempty"`
	Status      AgentStatus            `json:"status"`
	CreatedAt   time.Time              `json:"createdAt"`
	CompletedAt *time.Time             `json:"completedAt,omitempty"`
	Error       string                 `json:"error,omitempty"`
}

type AuditEntry struct {
	ID             string `json:"id"`
	Timestamp      string `json:"timestamp"`
	AgentID        string `json:"agentId"`
	Action         string `json:"action"`
	Payload        string `json:"payload"`
	Signature      string `json:"signature,omitempty"`
	TopicID        string `json:"topicId,omitempty"`
	SequenceNumber *int64 `json:"sequenceNumber,omitempty"`
}

type HederaIntegration struct {
	Network  string
	TopicID  *string
	Operator *OperatorCreds
}

type OperatorCreds struct {
	AccountID  string
	PrivateKey string
}

func NewHederaIntegration(network string) *HederaIntegration {
	return &HederaIntegration{
		Network: network,
	}
}

func (h *HederaIntegration) LogSwarmStart(data map[string]interface{}) AuditEntry {
	return AuditEntry{
		ID:        fmt.Sprintf("audit-%d", time.Now().UnixMilli()),
		Timestamp: time.Now().Format(time.RFC3339),
		AgentID:   "swarm-coordinator",
		Action:    "SWARM_START",
		Payload:   mustJson(data),
	}
}

func (h *HederaIntegration) LogSwarmComplete(data map[string]interface{}) AuditEntry {
	return AuditLogEntry{
		ID:        fmt.Sprintf("audit-%d", time.Now().UnixMilli()),
		Timestamp: time.Now().Format(time.RFC3339),
		AgentID:   "swarm-coordinator",
		Action:    "SWARM_COMPLETE",
		Payload:   mustJson(data),
	}
}

func (h *HederaIntegration) SignAndLog(agentID, task, status string, keyPair map[string]string) AuditEntry {
	payload := map[string]string{
		"agentId": agentID,
		"task":    task,
		"status":  status,
	}
	return AuditEntry{
		ID:        fmt.Sprintf("audit-%d-%s", time.Now().UnixMilli(), agentID),
		Timestamp: time.Now().Format(time.RFC3339),
		AgentID:   agentID,
		Action:    "AGENT_COMPLETE",
		Payload:   mustJson(payload),
		Signature: keyPair["publicKey"],
	}
}

type AggregatedResult struct {
	TotalAgents   int           `json:"totalAgents"`
	SuccessCount  int           `json:"successCount"`
	FailureCount  int           `json:"failureCount"`
	SuccessRate   float64       `json:"successRate"`
	TotalDuration int64         `json:"totalDuration"`
	Results       []AgentResult `json:"results"`
	Errors        []AgentError  `json:"errors"`
}

type AgentResult struct {
	AgentID  string      `json:"agentId"`
	Status   string      `json:"status"`
	Output   interface{} `json:"output,omitempty"`
	Error    string      `json:"error,omitempty"`
	Duration int64       `json:"duration"`
}

type AgentError struct {
	AgentID string `json:"agentId"`
	Error   string `json:"error"`
}

type ResultAggregator struct{}

func (ResultAggregator) Aggregate(agents []EphemeralAgent) AggregatedResult {
	successCount := 0
	failureCount := 0
	var totalDuration int64

	results := make([]AgentResult, len(agents))
	errors := make([]AgentError, 0)

	for i, agent := range agents {
		duration := int64(0)
		if agent.CompletedAt != nil {
			duration = agent.CompletedAt.Sub(agent.CreatedAt).Milliseconds()
		}
		totalDuration += duration

		if agent.Status == AgentStatusCompleted {
			successCount++
		} else if agent.Status == AgentStatusFailed {
			failureCount++
			errors = append(errors, AgentError{AgentID: agent.ID, Error: agent.Error})
		}

		results[i] = AgentResult{
			AgentID:  agent.ID,
			Status:   string(agent.Status),
			Output:   agent.Output,
			Error:    agent.Error,
			Duration: duration,
		}
	}

	totalAgents := len(agents)
	successRate := 0.0
	if totalAgents > 0 {
		successRate = float64(successCount) / float64(totalAgents)
	}

	return AggregatedResult{
		TotalAgents:   totalAgents,
		SuccessCount:  successCount,
		FailureCount:  failureCount,
		SuccessRate:   successRate,
		TotalDuration: totalDuration,
		Results:       results,
		Errors:        errors,
	}
}

type SwarmConfig struct {
	MaxParallel      int
	Timeout          int
	RetryAttempts    int
	RetryDelay       int
	EnableAuditTrail bool
	HederaNetwork    string
	PQCKeyPair       map[string]string
}

type SpawnTask struct {
	ID          string                 `json:"id"`
	Description string                 `json:"description"`
	Input       map[string]interface{} `json:"input"`
	ModelTier   ModelTier              `json:"modelTier"`
}

type SpawnRequest struct {
	Tasks    []SpawnTask `json:"tasks"`
	Strategy string      `json:"strategy"`
}

type SwarmSpawner struct {
	config       SwarmConfig
	router       *ModelRouter
	hedera       *HederaIntegration
	activeAgents map[string]*EphemeralAgent
	mu           sync.RWMutex
}

func NewSwarmSpawner(config *SwarmConfig) *SwarmSpawner {
	if config == nil {
		config = &SwarmConfig{
			MaxParallel:      5,
			Timeout:          120000,
			RetryAttempts:    2,
			RetryDelay:       1000,
			EnableAuditTrail: true,
			HederaNetwork:    "testnet",
		}
	}
	return &SwarmSpawner{
		config:       *config,
		router:       NewModelRouter(),
		hedera:       NewHederaIntegration(config.HederaNetwork),
		activeAgents: make(map[string]*EphemeralAgent),
	}
}

func (s *SwarmSpawner) Spawn(request SpawnRequest) (AggregatedResult, error) {
	startTime := time.Now()
	var auditEntries []AuditEntry

	if s.config.EnableAuditTrail {
		entry := s.hedera.LogSwarmStart(map[string]interface{}{
			"taskCount": len(request.Tasks),
			"strategy":  request.Strategy,
			"timestamp": startTime.Format(time.RFC3339),
		})
		auditEntries = append(auditEntries, entry)
	}

	agents := s.routeAndSpawn(request.Tasks)

	if request.Strategy == "sequential" {
		s.runSequential(agents, auditEntries)
	} else {
		s.runParallel(agents, auditEntries)
	}

	result := ResultAggregator{}.Aggregate(s.getActiveAgentsSlice())

	if s.config.EnableAuditTrail {
		_ = s.hedera.LogSwarmComplete(map[string]interface{}{
			"totalAgents":  result.TotalAgents,
			"successCount": result.SuccessCount,
			"failureCount": result.FailureCount,
			"duration":     time.Since(startTime).Milliseconds(),
			"auditEntries": len(auditEntries),
		})
	}

	return result, nil
}

func (s *SwarmSpawner) routeAndSpawn(tasks []SpawnTask) []*EphemeralAgent {
	agents := make([]*EphemeralAgent, len(tasks))
	for i, task := range tasks {
		model := s.router.SelectModel(task.ModelTier)
		agent := &EphemeralAgent{
			ID:        fmt.Sprintf("agent-%d-%s", time.Now().UnixNano(), generateID(9)),
			Task:      task.Description,
			Model:     model,
			Input:     task.Input,
			Status:    AgentStatusPending,
			CreatedAt: time.Now(),
		}
		s.mu.Lock()
		s.activeAgents[agent.ID] = agent
		s.mu.Unlock()
		agents[i] = agent
	}
	return agents
}

func (s *SwarmSpawner) runParallel(agents []*EphemeralAgent, _ []AuditEntry) {
	chunkSize := s.config.MaxParallel
	for i := 0; i < len(agents); i += chunkSize {
		end := i + chunkSize
		if end > len(agents) {
			end = len(agents)
		}
		chunk := agents[i:end]
		var wg sync.WaitGroup
		for _, agent := range chunk {
			wg.Add(1)
			go func(a *EphemeralAgent) {
				defer wg.Done()
				s.executeAgent(a)
			}(agent)
		}
		wg.Wait()
	}
}

func (s *SwarmSpawner) runSequential(agents []*EphemeralAgent, _ []AuditEntry) {
	for _, agent := range agents {
		s.executeAgent(agent)
	}
}

func (s *SwarmSpawner) executeAgent(agent *EphemeralAgent) {
	agent.Status = AgentStatusRunning

	result, err := s.invokeModel(agent)
	if err != nil {
		agent.Status = AgentStatusFailed
		agent.Error = err.Error()
	} else {
		agent.Status = AgentStatusCompleted
		agent.Output = result
	}

	now := time.Now()
	agent.CompletedAt = &now

	s.mu.Lock()
	if a, ok := s.activeAgents[agent.ID]; ok {
		a.Status = agent.Status
		a.Output = agent.Output
		a.Error = agent.Error
		a.CompletedAt = agent.CompletedAt
	}
	s.mu.Unlock()
}

func (s *SwarmSpawner) invokeModel(agent *EphemeralAgent) (interface{}, error) {
	time.Sleep(100 * time.Millisecond)
	return map[string]interface{}{
		"agentId": agent.ID,
		"result":  fmt.Sprintf("Processed: %s", agent.Task),
	}, nil
}

func (s *SwarmSpawner) getActiveAgentsSlice() []EphemeralAgent {
	s.mu.RLock()
	defer s.mu.RUnlock()
	agents := make([]EphemeralAgent, 0, len(s.activeAgents))
	for _, a := range s.activeAgents {
		agents = append(agents, *a)
	}
	return agents
}

func (s *SwarmSpawner) Destroy() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.activeAgents = make(map[string]*EphemeralAgent)
}

func mustJson(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func generateID(n int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
		time.Sleep(time.Nanosecond)
	}
	return string(b)
}

func main() {
	config := &SwarmConfig{
		MaxParallel:      3,
		Timeout:          60000,
		EnableAuditTrail: true,
		HederaNetwork:    "testnet",
	}

	spawner := NewSwarmSpawner(config)

	request := SpawnRequest{
		Tasks: []SpawnTask{
			{ID: "task-1", Description: "Validate RSA-2048 vulnerability", Input: map[string]interface{}{"keyType": "RSA", "keySize": 2048}, ModelTier: ModelTierBalanced},
			{ID: "task-2", Description: "Scan SSL certificates", Input: map[string]interface{}{"targets": []string{"example.com"}}, ModelTier: ModelTierFast},
			{ID: "task-3", Description: "Generate PQC migration plan", Input: map[string]interface{}{"currentConfig": "ECDSA-P256"}, ModelTier: ModelTierDeep},
		},
		Strategy: "parallel",
	}

	result, err := spawner.Spawn(request)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("Swarm complete: %d/%d tasks succeeded (%.1f%%)\n", result.SuccessCount, result.TotalAgents, result.SuccessRate*100)
	spawner.Destroy()
}

type AuditLogEntry = AuditEntry
