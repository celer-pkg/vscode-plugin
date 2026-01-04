import * as vscode from 'vscode';
import * as os from 'os';
import { Celer } from '../celer';

/**
 * Install packages with options
 */
export function registerInstallCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.install', async () => {
        // First ask: install all or select package
        const choice = await vscode.window.showQuickPick(
            [
                { label: '$(cloud-download) Install All Dependencies', description: 'Install all packages from celer.toml', value: 'all' },
                { label: '$(search) Search and Install Package', description: 'Search for a specific package to install', value: 'search' }
            ],
            { placeHolder: 'What do you want to install?' }
        );

        if (!choice) {
            return; // User cancelled
        }

        let packageName: string | undefined;

        if (choice.value === 'all') {
            packageName = undefined; // Install all
        } else {
            // Search for package
            const availablePorts = await celer.getAvailablePorts();
            if (availablePorts.length === 0) {
                vscode.window.showWarningMessage('No ports found in workspace');
                return;
            }

            // Create quick pick for searching
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

            packageName = selected.portFullName;
        }

        // Build command arguments
        const args: string[] = ['install'];
        
        if (packageName) {
            // Show all options for multi-select
            const options = await vscode.window.showQuickPick(
                [
                    { label: '$(beaker) Dev Dependency', description: 'Install as development dependency', picked: false, flag: '--dev' },
                    { label: '$(sync) Force', description: 'Force reinstallation', picked: false, flag: '--force' },
                    { label: '$(layers) Recursive', description: 'Recursively reinstall dependencies (requires --force)', picked: false, flag: '--recursive' },
                    { label: '$(comment) Verbose', description: 'Enable verbose output', picked: false, flag: '--verbose' }
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

            // Ask for jobs if needed
            const defaultJobs = os.cpus().length;
            const jobs = await vscode.window.showInputBox({
                prompt: 'Number of parallel jobs (press Enter to use default)',
                value: defaultJobs.toString(),
                validateInput: (value) => {
                    const num = parseInt(value);
                    if (isNaN(num) || num < 1) {
                        return 'Must be a positive number';
                    }
                    return null;
                }
            });
            if (jobs === undefined) {
                return; // User cancelled
            }
            if (jobs && parseInt(jobs) !== defaultJobs) {
                args.push(`--jobs=${jobs}`);
            }

            args.push(packageName);
        }

        // Run install command in terminal
        await celer.runCommandInTerminal(args);
    })
    );
}
