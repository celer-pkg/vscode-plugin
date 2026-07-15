import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Update conf repo, ports config repo or project repo
 */
export function registerUpdateCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.update', async () => {
        const updateType = await vscode.window.showQuickPick(
            [
                { label: '$(cloud-download) Update Conf Repository', value: 'conf-repo', description: 'Update configuration files repository' },
                { label: '$(package) Update Ports Repository', value: 'ports-repo', description: 'Update ports configuration repository' },
                { label: '$(library) Update Port Repos', value: 'ports', description: 'Update third-party library source repositories' }
            ],
            { placeHolder: 'What do you want to update?' }
        );

        if (!updateType) {
            return;
        }

        switch (updateType.value) {
            case 'conf-repo':
                // Update conf repository
                await celer.runCommandInTerminal(['update', '-c']);
                break;

            case 'ports-repo':
                // Update ports repository
                await celer.runCommandInTerminal(['update', '-p']);
                break;

            case 'ports': {
                // Get installed packages from buildtrees
                const installedPackages = await celer.getInstalledPackages();
                if (installedPackages.length === 0) {
                    vscode.window.showWarningMessage('No installed packages found in buildtrees directory');
                    return;
                }

                // Show multi-select quick pick
                const selectedPackages = await vscode.window.showQuickPick(
                    installedPackages.map(pkg => ({ label: pkg, picked: false })),
                    {
                        placeHolder: 'Select packages to update (Space to select, Enter to confirm)',
                        canPickMany: true
                    }
                );

                if (!selectedPackages || selectedPackages.length === 0) {
                    return;
                }

                // Ask for update options
                const options = await vscode.window.showQuickPick(
                    [
                        { label: '$(sync) Normal Update', value: 'normal', description: 'Update selected packages' },
                        { label: '$(git-branch) Recursive Update', value: 'recursive', description: 'Update packages and all dependencies' },
                        { label: '$(warning) Force Update', value: 'force', description: 'Force update (overwrites local changes)' },
                        { label: '$(issue-reopened) Recursive + Force', value: 'recursive-force', description: 'Recursive and force update' }
                    ],
                    { placeHolder: 'Select update mode' }
                );

                if (!options) {
                    return;
                }

                // Build command arguments
                const args = ['update'];
                const packageNames = selectedPackages.map(item => item.label);
                
                if (options.value === 'recursive') {
                    args.push('-r');
                } else if (options.value === 'force') {
                    args.push('-f');
                } else if (options.value === 'recursive-force') {
                    args.push('-r', '-f');
                }
                
                args.push(...packageNames);

                // Execute update in terminal
                await celer.runCommandInTerminal(args);
                break;
            }
        }
    })
    );
}
