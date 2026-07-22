import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Install packages with options
 */
export function registerInstallCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.install', async () => {
        // Get all available ports
        const availablePorts = await celer.getAvailablePorts();
        if (availablePorts.length === 0) {
            vscode.window.showWarningMessage('No ports found in workspace');
            return;
        }

        // Create quick pick for searching packages
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Type to search packages (supports wildcards: zlib*, *@1.3.1, *lib*)';
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

        // Build command arguments
        const args: string[] = ['install'];
        
        // Show all options for multi-select
        const options = await vscode.window.showQuickPick(
            [
                { label: '$(beaker) Dev Dependency', description: 'Install as development dependency (--dev)', picked: false, flag: '--dev' },
                { label: '$(sync) Force', description: 'Force reinstallation (--force)', picked: false, flag: '--force' },
                { label: '$(layers) Recursive', description: 'Recursively reinstall dependencies (requires --force) (--recursive)', picked: false, flag: '--recursive' },
                { label: '$(comment) Verbose', description: 'Enable verbose output (--verbose)', picked: false, flag: '--verbose' }
            ],
            { 
                placeHolder: 'Select installation options (multi-select, or skip for normal install)',
                canPickMany: true 
            }
        );

        if (options === undefined) {
            return; // User cancelled
        }

        // Add selected flags
        for (const opt of options) {
            args.push((opt as any).flag);
        }

        // Add package name at the end
        args.push(packageName);

        // Run install command in terminal
        await celer.runCommandInTerminal(args);
    })
    );
}
