// Hedera SDK imports
import {
  Client,
  AccountId,
  PrivateKey,
  TopicId,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

export interface AuditEntry {
  id: string;
  timestamp: string;
  agentId: string;
  action: "SWARM_START" | "SWARM_COMPLETE" | "AGENT_BIRTH" | "AGENT_DEATH" | "AGENT_COMPLETE";
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

  constructor(network: "testnet" | "mainnet" = "testnet") {
    const envVar =
      network === "testnet"
        ? "HEDERA_OPERATOR_ID"
        : "HEDERA_MAINNET_OPERATOR_ID";
    const keyVar =
      network === "testnet"
        ? "HEDERA_OPERATOR_KEY"
        : "HEDERA_MAINNET_OPERATOR_KEY";

    const operatorId = process.env[envVar];
    const operatorKey = process.env[keyVar];

    if (operatorId && operatorKey) {
      this.operatorId = AccountId.fromString(operatorId);
      this.operatorKey = PrivateKey.fromString(operatorKey);
      this.client =
        network === "mainnet"
          ? Client.forMainnet().setOperator(this.operatorId, this.operatorKey)
          : Client.forTestnet().setOperator(this.operatorId, this.operatorKey);
    } else {
      this.client =
        network === "mainnet" ? Client.forMainnet() : Client.forTestnet();
    }
  }

  async createAuditTopic(description: string): Promise<string> {
    if (!this.operatorId || !this.operatorKey) {
      throw new Error(
        "Operator credentials required. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY",
      );
    }

    const transaction = new TopicCreateTransaction().setTopicMemo(
      `Swarm Spawner Audit: ${description}`,
    );

    const response = await transaction.execute(this.client);
    const receipt = await response.getReceipt(this.client);

    if (receipt.topicId) {
      this.topicId = receipt.topicId;
      return this.topicId.toString();
    }
    throw new Error("Failed to create topic");
  }

  async logSwarmStart(data: {
    taskCount: number;
    strategy: string;
    timestamp: string;
  }): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: data.timestamp,
      agentId: "swarm-coordinator",
      action: "SWARM_START",
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
      agentId: "swarm-coordinator",
      action: "SWARM_COMPLETE",
      payload: JSON.stringify(data),
    };

    return this.submitAuditEntry(entry);
  }

  async signAndLog(
    agent: { id: string; task: string; status: string },
    keyPair: { publicKey: string; privateKey: string },
  ): Promise<AuditEntry> {
    const payload = JSON.stringify({
      agentId: agent.id,
      task: agent.task,
      status: agent.status,
    });
    const pqcResult = await this.signWithPQC(payload, keyPair);

    const entry: AuditEntry = {
      id: `audit-${Date.now()}-${agent.id}`,
      timestamp: new Date().toISOString(),
      agentId: agent.id,
      action: "AGENT_COMPLETE",
      payload,
      signature: pqcResult.signature,
    };

    return this.submitAuditEntry(entry);
  }

  /**
   * @deprecated Use PQCIdentityManager for real ML-DSA-65 signing.
   * This legacy method is retained only for backward compatibility
   * with v0.1.0 consumers. It provides NO cryptographic security.
   */
  async signWithPQC(
    payload: string,
    _keyPair: { publicKey: string; privateKey: string },
  ): Promise<PQCSigningResult> {
    console.warn(
      "[Hedera] signWithPQC() is deprecated and provides no security. Use PQCIdentityManager instead.",
    );
    return {
      signature: "(deprecated-no-crypto)",
      publicKey: _keyPair.publicKey,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * @deprecated Use PQCIdentityManager.verify() for real ML-DSA-65 verification.
   * This method always returns false to prevent false-positive trust.
   */
  async verifyPQCSignature(
    _payload: string,
    _signature: string,
    _publicKey: string,
  ): Promise<boolean> {
    console.warn(
      "[Hedera] verifyPQCSignature() is deprecated. Use PQCIdentityManager.verify() instead.",
    );
    return false;
  }

  private async submitAuditEntry(entry: AuditEntry): Promise<AuditEntry> {
    if (!this.topicId || !this.operatorId || !this.operatorKey) {
      console.log("[Hedera] Audit entry (no topic configured):", entry);
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
      console.error("[Hedera] Failed to submit audit entry:", error);
    }

    return entry;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

