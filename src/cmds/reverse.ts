import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Query libraries that depend on the specified package (reverse dependency lookup)
 */
export function registerReverseCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.reverse', async () => {
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

        // Create quick pick for searching packages
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Type to search packages (supports wildcards: eigen*, *@3.4.0, *lib*)';
        quickPick.matchOnDescription = true;

        const createPortItems = (ports: string[], filterPattern: string) => {
            const pattern = filterPattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            const regex = new RegExp(pattern, 'i');
            const filtered = ports.filter(port => regex.test(port));
            
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

        quickPick.items = [];

        quickPick.onDidChangeValue((value) => {
            if (!value) {
                quickPick.items = [];
            } else {
                quickPick.items = createPortItems(availablePorts, value);
            }
        });

        const selected = await new Promise<any>((resolve) => {
            quickPick.onDidAccept(() => {
                const item = quickPick.selectedItems[0];
                quickPick.hide();
                resolve(item);
            });
            quickPick.onDidHide(() => {
                resolve(undefined);
            });
            quickPick.show();
        });

        if (!selected) {
            return; // User cancelled
        }

        const packageName = selected.portFullName;

        // Ask if user wants to include development dependencies (checkbox style)
        const options = await vscode.window.showQuickPick(
            [
                { 
                    label: '$(beaker) Development Dependencies', 
                    description: 'Search development dependencies',
                    picked: false
                }
            ],
            { 
                placeHolder: 'Select options (Space to toggle, Enter to confirm)',
                title: 'Reverse Dependency Lookup Options',
                canPickMany: true
            }
        );

        // Build command arguments
        const args: string[] = ['reverse'];
        
        // Add --dev flag if the option is selected
        if (options && options.length > 0) {
            args.push('--dev');
        }

        // Add package name at the end
        args.push(packageName);

        try {
            await celer.runCommandInTerminal(args);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show reverse dependencies: ${error}`);
        }
    })
    );
}
