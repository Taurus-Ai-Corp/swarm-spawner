import { SwarmSpawner } from '../src/spawner.js';
import type { SwarmConfig } from '../src/spawner.js';

const config: Partial<SwarmConfig> = {
  maxParallel: 3,
  timeout: 60000,
  enableAuditTrail: true,
  hederaNetwork: 'testnet',
  pqcKeyPair: {
    publicKey: process.env.PQC_PUBLIC_KEY ?? 'demo-public-key',
    privateKey: process.env.PQC_PRIVATE_KEY ?? 'demo-private-key',
  },
};

async function runPQCValidationExample() {
  console.log('=== Swarm Spawner: Hedera PQC Validation Example ===\n');

  const spawner = new SwarmSpawner(config);

  spawner.on('agent:start', (agent) => {
    console.log(`[Start] Agent ${agent.id} using ${agent.model.provider}/${agent.model.model}`);
  });

  spawner.on('agent:complete', (agent) => {
    console.log(`[Complete] Agent ${agent.id}: ${agent.status}`);
  });

  spawner.on('complete', (result) => {
    console.log('\n=== Swarm Results ===');
    console.log(`Total: ${result.totalAgents}, Success: ${result.successCount}, Failed: ${result.failureCount}`);
    console.log(`Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
    console.log(`Duration: ${result.totalDuration}ms`);
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors);
    }
  });

  const request = {
    tasks: [
      {
        id: 'pqc-validate-1',
        description: 'Validate RSA-2048 key is quantum-vulnerable',
        input: { keyType: 'RSA', keySize: 2048 },
        modelTier: 'balanced' as const,
      },
      {
        id: 'pqc-validate-2',
        description: 'Scan SSL certificates for post-quantum readiness',
        input: { targets: ['example.com', 'api.example.com'] },
        modelTier: 'fast' as const,
      },
      {
        id: 'pqc-validate-3',
        description: 'Generate PQC migration recommendations',
        input: { currentConfig: { algorithm: 'ECDSA-P256' } },
        modelTier: 'deep' as const,
      },
      {
        id: 'pqc-validate-4',
        description: 'Audit cryptographic supply chain',
        input: { providers: ['cloudflare', 'aws', 'azure'] },
        modelTier: 'balanced' as const,
      },
    ],
    strategy: 'parallel' as const,
  };

  console.log('Spawning swarm with', request.tasks.length, 'tasks...\n');
  
  const result = await spawner.spawn(request);
  
  console.log('\n=== Output Results ===');
  result.results.forEach((r) => {
    console.log(`- ${r.agentId}: ${r.status} (${r.duration}ms)`);
  });

  spawner.destroy();
}

runPQCValidationExample().catch(console.error);