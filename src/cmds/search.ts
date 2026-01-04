import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Celer, Package } from '../celer';

// Parse search output
function parseSearchOutput(output: string): Package[] {
    const packages: Package[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
        // Try to parse lines like "package-name version - description"
        const match = line.match(/^([\w-]+)\s+([\d.]+)(?:\s+-\s+(.+))?$/);
        if (match) {
            packages.push({
                name: match[1],
                version: match[2],
                description: match[3]
            });
        }
    }

    return packages;
}

/**
 * Search available ports from ports repository
 */
export function registerSearchCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.search', async () => {
        // Get all available ports from local ports directory
        const availablePorts = await celer.getAvailablePorts();

        if (availablePorts.length === 0) {
            const action = await vscode.window.showWarningMessage(
                'No ports found in ports directory. Make sure you have initialized the project with "celer init".',
                'View Logs', 'Initialize Project'
            );
            
            if (action === 'View Logs') {
                celer.showOutput();
            } else if (action === 'Initialize Project') {
                vscode.commands.executeCommand('celer.init');
            }
            return;
        }

        // Create quick pick with filtering support
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Type to search ports (supports wildcards: zlib*, *@1.3.1, *lib*)';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;

        // Function to create port items
        const createPortItems = (ports: string[], filterPattern: string) => {
            // Convert wildcard pattern to regex
            const pattern = filterPattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            const regex = new RegExp(pattern, 'i');
            const filtered = ports.filter(port => regex.test(port));
            
            // Limit results to avoid performance issues
            const maxResults = 100;
            const limitedPorts = filtered.slice(0, maxResults);
            
            return limitedPorts.map(port => {
                const [name, version] = port.split('@');
                return {
                    label: `$(package) ${name}`,
                    description: version || '',
                    portFullName: port
                };
            });
        };

        // Don't show any items initially
        quickPick.items = [];

        quickPick.onDidChangeValue((value) => {
            if (!value) {
                // Clear items when search is empty
                quickPick.items = [];
            } else {
                // Filter ports based on pattern
                quickPick.items = createPortItems(availablePorts, value);
            }
        });

        quickPick.onDidAccept(async () => {
            const selected = quickPick.selectedItems[0] as any;
            if (selected) {
                const fullName = selected.portFullName; // e.g., "zlib@1.3.1"
                const [portName, version] = fullName.split('@');
                quickPick.hide();
                
                // Open the port TOML file
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceFolder) {
                    const firstLetter = portName[0].toLowerCase();
                    const portTomlPath = path.join(
                        workspaceFolder, 
                        'ports', 
                        firstLetter, 
                        portName, 
                        version,
                        'port.toml'
                    );
                    if (fs.existsSync(portTomlPath)) {
                        const doc = await vscode.workspace.openTextDocument(portTomlPath);
                        await vscode.window.showTextDocument(doc);
                    } else {
                        vscode.window.showWarningMessage(`Port file not found: ${portTomlPath}`);
                    }
                }
            }
        });

        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
    })
    );
}
