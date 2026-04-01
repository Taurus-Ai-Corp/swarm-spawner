// PQC stub - replace with @noble/post-quantum/kyber when ready for production
// import { mlkem768 } from '@noble/post-quantum/kyber';

interface PQCKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

async function generatePQCKeyPair(seed: Uint8Array): Promise<PQCKeyPair> {
  // Stub: In production, use @noble/post-quantum/kyber
  // const keyPair = mlkem768.generateKeyPair(seed);
  const publicKey = new Uint8Array(32);
  const secretKey = new Uint8Array(32);
  publicKey.set(seed.slice(0, 32));
  secretKey.set(seed.slice(0, 32));
  return { publicKey, secretKey };
}

async function pqcSign(message: Uint8Array, secretKey: Uint8Array): Promise<Uint8Array> {
  // Stub: In production, use mlkem768.sign(message, secretKey)
  const sig = new Uint8Array(message.length + 32);
  sig.set(message);
  return sig;
}

// Hedera SDK imports
import { Client, AccountId, PrivateKey, TopicId, TopicMessageSubmitTransaction } from '@hashgraph/sdk';

export interface AuditEntry {
  id: string;
  timestamp: string;
  agentId: string;
  action: string;
  payload: string;
  signature?: string;
  topicId?: string;
  sequenceNumber?: number;
}

export interface PQCSigningResult {
  signature: string;
  publicKey: string;
  timestamp: string;
}

export class HederaIntegration {
  private client: Client;
  private topicId?: TopicId;
  private operatorId?: AccountId;
  private operatorKey?: PrivateKey;

  constructor(network: 'testnet' | 'mainnet' = 'testnet') {
    const envVar = network === 'testnet' ? 'HEDERA_OPERATOR_ID' : 'HEDERA_MAINNET_OPERATOR_ID';
    const keyVar = network === 'testnet' ? 'HEDERA_OPERATOR_KEY' : 'HEDERA_MAINNET_OPERATOR_KEY';
    
    const operatorId = process.env[envVar];
    const operatorKey = process.env[keyVar];

    if (operatorId && operatorKey) {
      this.operatorId = AccountId.fromString(operatorId);
      this.operatorKey = PrivateKey.fromString(operatorKey);
      this.client = Client.forTestnet().setOperator(this.operatorId, this.operatorKey);
    } else {
      this.client = Client.forTestnet();
    }
  }

  async createAuditTopic(description: string): Promise<string> {
    if (!this.operatorId || !this.operatorKey) {
      throw new Error('Operator credentials required. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY');
    }

    const transaction = new TopicMessageSubmitTransaction({
      topicId: undefined,
      message: `Swarm Spawner Audit Topic: ${description}`,
    });

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);
    
    if (receipt.topicId) {
      this.topicId = receipt.topicId;
      return this.topicId.toString();
    }
    throw new Error('Failed to create topic');
  }

  async logSwarmStart(data: { taskCount: number; strategy: string; timestamp: string }): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: data.timestamp,
      agentId: 'swarm-coordinator',
      action: 'SWARM_START',
      payload: JSON.stringify(data),
    };

    return this.submitAuditEntry(entry);
  }

  async logSwarmComplete(data: {
    successCount: number;
    failureCount: number;
    duration: number;
    auditEntries: AuditEntry[];
  }): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agentId: 'swarm-coordinator',
      action: 'SWARM_COMPLETE',
      payload: JSON.stringify(data),
    };

    return this.submitAuditEntry(entry);
  }

  async signAndLog(agent: { id: string; task: string; status: string }, keyPair: { publicKey: string; privateKey: string }): Promise<AuditEntry> {
    const payload = JSON.stringify({ agentId: agent.id, task: agent.task, status: agent.status });
    const pqcResult = await this.signWithPQC(payload, keyPair);

    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${agent.id}`,
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      action: 'AGENT_COMPLETE',
      payload,
      signature: pqcResult.signature,
    };

    return this.submitAuditEntry(entry);
  }

  async signWithPQC(payload: string, keyPair: { publicKey: string; privateKey: string }): Promise<PQCSigningResult> {
    const encoder = new TextEncoder();
    const message = encoder.encode(payload);

    const privateKeyBytes = Uint8Array.from(atob(keyPair.privateKey), c => c.charCodeAt(0));
    const keySeed = privateKeyBytes.slice(0, 32);
    const keyPairPQC = await generatePQCKeyPair(keySeed);

    const signature = await pqcSign(message, keyPairPQC.secretKey);

    return {
      signature: btoa(String.fromCharCode(...signature)),
      publicKey: keyPair.publicKey,
      timestamp: new Date().toISOString(),
    };
  }

  async verifyPQCSignature(payload: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const message = encoder.encode(payload);
      const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      const pubKeyBytes = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0));

      // Stub verification - always true for demo
      return message.length > 0 && sigBytes.length > 0 && pubKeyBytes.length > 0;
    } catch {
      return false;
    }
  }

  async mintCredential(agentId: string, metadata: Record<string, unknown>): Promise<string> {
    console.log(`[Hedera] Minting credential for agent ${agentId}`, metadata);
    return `credential-${agentId}-${Date.now()}`;
  }

  private async submitAuditEntry(entry: AuditEntry): Promise<AuditEntry> {
    if (!this.topicId || !this.operatorId || !this.operatorKey) {
      console.log('[Hedera] Audit entry (no topic configured):', entry);
      return entry;
    }

    try {
      const transaction = new TopicMessageSubmitTransaction({
        topicId: this.topicId,
        message: JSON.stringify(entry),
      });

      const response = await transaction.execute(this.client);
      const receipt = await response.getReceipt(this.client);

      entry.topicId = this.topicId.toString();
      entry.sequenceNumber = receipt.topicSequenceNumber?.low ?? 0;
    } catch (error) {
      console.error('[Hedera] Failed to submit audit entry:', error);
    }

    return entry;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export type { Client, AccountId, PrivateKey, TopicId };