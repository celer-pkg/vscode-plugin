import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Remove build cache and clean source repository
 */
export function registerCleanCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.clean', async () => {
        // Ask what to clean
        const cleanTarget = await vscode.window.showQuickPick(
            [
                { label: '$(trash) Clean All Packages', description: 'Clean all packages (--all)', value: 'all' },
                { label: '$(package) Clean Specific Package(s)', description: 'Search and select package(s) to clean', value: 'packages' }
            ],
            { placeHolder: 'What do you want to clean?' }
        );

        if (!cleanTarget) {
            return; // User cancelled
        }

        let packageNames: string[] = [];

        if (cleanTarget.value === 'packages') {
            // Search for packages from installed packages
            const installedPackages = await celer.getInstalledPackages();
            if (installedPackages.length === 0) {
                vscode.window.showWarningMessage('No installed packages found');
                return;
            }

            // Create quick pick for searching with multi-select
            const quickPick = vscode.window.createQuickPick();
            quickPick.placeholder = 'Type to search installed packages (supports wildcards)';
            quickPick.matchOnDescription = true;
            quickPick.canSelectMany = true;

            const createPackageItems = (packages: string[], filterPattern: string) => {
                const pattern = filterPattern
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.');
                const regex = new RegExp(pattern, 'i');
                const filtered = packages.filter(pkg => regex.test(pkg));
                
                const maxResults = 100;
                const limitedPackages = filtered.slice(0, maxResults);
                
                return limitedPackages.map(pkg => {
                    const [name, version] = pkg.split('@');
                    return {
                        label: `$(package) ${name}`,
                        description: version || '',
                        packageFullName: pkg
                    };
                });
            };

            quickPick.items = [];

            quickPick.onDidChangeValue((value) => {
                if (!value) {
                    quickPick.items = [];
                } else {
                    quickPick.items = createPackageItems(installedPackages, value);
                }
            });

            const selected = await new Promise<any[]>((resolve) => {
                quickPick.onDidAccept(() => {
                    const items = quickPick.selectedItems;
                    quickPick.hide();
                    resolve(Array.from(items));
                });
                quickPick.onDidHide(() => {
                    resolve([]);
                });
                quickPick.show();
            });

            if (selected.length === 0) {
                return; // User cancelled or selected nothing
            }

            packageNames = selected.map((item: any) => item.packageFullName);
        }

        // Show options for multi-select
        const options = await vscode.window.showQuickPick(
            [
                { label: '$(beaker) Dev Mode', description: 'Clean package/project for dev mode', picked: false, flag: '--dev' },
                { label: '$(layers) Recursive', description: 'Clean package along with its dependencies', picked: false, flag: '--recursive' }
            ],
            { 
                placeHolder: 'Select clean options (multi-select, or skip for normal clean)',
                canPickMany: true 
            }
        );

        if (options === undefined) {
            return; // User cancelled
        }

        const confirmation = await vscode.window.showWarningMessage(
            cleanTarget.value === 'all' 
                ? 'This will clean all packages. Continue?' 
                : `This will clean ${packageNames.length} package(s). Continue?`,
            'Yes', 'No'
        );

        if (confirmation !== 'Yes') {
            return;
        }

        // Build command arguments
        const args: string[] = ['clean'];
        
        if (cleanTarget.value === 'all') {
            args.push('--all');
        }

        // Add selected flags
        for (const opt of options) {
            args.push((opt as any).flag);
        }

        // Add package names
        if (cleanTarget.value === 'packages') {
            args.push(...packageNames);
        }

        await celer.runCommandInTerminal(args);
    })
    );
}
