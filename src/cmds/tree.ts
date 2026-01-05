import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Show the dependency tree of a package or project
 */
export function registerTreeCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.tree', async () => {
        // Ask user what to show tree for
        const treeTarget = await vscode.window.showQuickPick(
            [
                { label: '$(project) Show Project Tree', description: 'Show dependency tree of a project', value: 'project' },
                { label: '$(package) Show Package Tree', description: 'Show dependency tree of a package', value: 'package' }
            ],
            { placeHolder: 'Select what to show dependency tree for' }
        );

        if (!treeTarget) {
            return; // User cancelled
        }

        let packageName: string | undefined;

        if (treeTarget.value === 'package') {
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
            quickPick.placeholder = 'Type to search packages (supports wildcards: boost*, *@1.87.0, *cv*)';
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
        } else if (treeTarget.value === 'project') {
            // Get all available projects
            const availableProjects = await celer.getAvailableProjects();

            if (availableProjects.length === 0) {
                vscode.window.showWarningMessage('No projects found in conf/projects directory');
                return;
            }

            // Show project selection
            const selectedProject = await vscode.window.showQuickPick(
                availableProjects.map(project => ({
                    label: `$(folder) ${project}`,
                    projectName: project
                })),
                { placeHolder: 'Select a project to show dependency tree' }
            );

            if (!selectedProject) {
                return; // User cancelled
            }

            packageName = (selectedProject as any).projectName;
        }

        // Ask if user wants to hide development dependencies (checkbox style)
        const options = await vscode.window.showQuickPick(
            [
                { 
                    label: '$(eye-closed) Hide Development Dependencies', 
                    description: 'Hide dev dependencies in the tree (--hide-dev)',
                    picked: false
                }
            ],
            { 
                placeHolder: 'Select options (Space to toggle, Enter to confirm)',
                title: 'Dependency Tree Options',
                canPickMany: true
            }
        );

        // Build command arguments
        const args: string[] = ['tree'];
        
        // Add package name if specified
        if (packageName) {
            args.push(packageName);
        }

        // Add --hide-dev flag if the option is selected
        if (options && options.length > 0) {
            args.push('--hide-dev');
        }

        try {
            await celer.runCommandInTerminal(args);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show tree: ${error}`);
        }
    })
    );
}
