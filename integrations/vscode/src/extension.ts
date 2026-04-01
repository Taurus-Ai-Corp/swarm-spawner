import * as vscode from 'vscode';
import { SwarmSpawner, type SwarmConfig, type SpawnRequest } from '../../src/spawner.js';

let spawner: SwarmSpawner | undefined;
let statusBar: vscode.StatusBarItem;

function getConfig(): Partial<SwarmConfig> {
  const workspaceConfig = vscode.workspace.getConfiguration('swarmSpawner');
  return {
    maxParallel: workspaceConfig.get('maxParallel', 5),
    timeout: workspaceConfig.get('timeout', 120000),
    enableAuditTrail: workspaceConfig.get('enableAuditTrail', true),
    hederaNetwork: workspaceConfig.get('hederaNetwork', 'testnet'),
  };
}

function initSpawner(): SwarmSpawner {
  if (!spawner) {
    spawner = new SwarmSpawner(getConfig());
    
    spawner.on('agent:start', (agent) => {
      vscode.window.showInformationMessage(`[Swarm] Agent ${agent.id} started using ${agent.model.provider}/${agent.model.model}`);
    });
    
    spawner.on('agent:complete', (agent) => {
      updateStatusBar();
    });
    
    spawner.on('complete', (result) => {
      vscode.window.showInformationMessage(
        `Swarm complete: ${result.successCount}/${result.totalAgents} tasks succeeded (${Math.round(result.successRate * 100)}% success rate)`
      );
      updateStatusBar();
    });
  }
  return spawner;
}

function updateStatusBar(): void {
  if (!statusBar) return;
  const agents = spawner?.getActiveAgents() ?? [];
  const running = agents.filter(a => a.status === 'running').length;
  statusBar.text = `$(hubot) Swarm: ${running} active`;
  statusBar.show();
}

export function activate(context: vscode.ExtensionContext): void {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(hubot) Swarm: Ready';
  statusBar.show();
  
  context.subscriptions.push(statusBar);

  const spawnCommand = vscode.commands.registerCommand('swarm-spawner.spawn', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const taskText = editor.document.getText(selection);
    
    if (!taskText.trim()) {
      vscode.window.showErrorMessage('No task selected. Please select the task description.');
      return;
    }

    const s = initSpawner();
    
    const request: SpawnRequest = {
      tasks: [
        {
          id: `task-${Date.now()}`,
          description: taskText,
          input: { file: editor.document.uri.fsPath },
          modelTier: 'balanced',
        },
      ],
      strategy: 'parallel',
    };

    try {
      const result = await s.spawn(request);
      vscode.window.showInformationMessage(`Swarm completed: ${result.successCount}/${result.totalAgents}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Swarm failed: ${error}`);
    }
  });

  const statusCommand = vscode.commands.registerCommand('swarm-spawner.status', () => {
    const agents = spawner?.getActiveAgents() ?? [];
    if (agents.length === 0) {
      vscode.window.showInformationMessage('No active agents');
      return;
    }
    
    const info = agents.map(a => `${a.id}: ${a.status}`).join('\n');
    vscode.window.showInformationMessage(`Active Agents:\n${info}`);
  });

  const stopCommand = vscode.commands.registerCommand('swarm-spawner.stop', () => {
    spawner?.destroy();
    spawner = undefined;
    vscode.window.showInformationMessage('All agents stopped');
    statusBar.text = '$(hubot) Swarm: Ready';
  });

  context.subscriptions.push(spawnCommand, statusCommand, stopCommand);
}

export function deactivate(): void {
  spawner?.destroy();
  statusBar?.dispose();
}