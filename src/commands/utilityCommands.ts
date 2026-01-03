import * as vscode from 'vscode';
import { Celer } from '../celer';
import { CelerTreeProvider } from '../celerTreeProvider';

/**
 * Register utility commands (search, refresh)
 */
export function registerUtilityCommands(
    context: vscode.ExtensionContext,
    celerManager: Celer,
    dependencyTreeProvider: CelerTreeProvider): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.search', async () => {
            const searchQuery = await vscode.window.showInputBox({
                prompt: 'Enter package name to search',
                placeHolder: 'package-name'
            });

            if (searchQuery) {
                try {
                    const packages = await celerManager.search(searchQuery);

                    if (packages.length === 0) {
                        vscode.window.showInformationMessage(`No packages found matching "${searchQuery}"`);
                        return;
                    }

                    await vscode.window.showQuickPick(
                        packages.map(pkg => ({
                            label: pkg.name,
                            description: pkg.version,
                            detail: pkg.description
                        })),
                        {
                            placeHolder: 'Search results'
                        }
                    );
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        }),

        vscode.commands.registerCommand('celer.refresh', () => {
            dependencyTreeProvider.refresh();
            vscode.window.showInformationMessage('Celer dependencies refreshed');
        }),

        vscode.commands.registerCommand('celer.tree', async () => {
            const packageName = await vscode.window.showInputBox({
                prompt: 'Enter package name to show dependency tree (leave empty for project tree)',
                placeHolder: 'package-name (optional)'
            });

            try {
                await celerManager.tree(packageName);
            } catch (error) {
                // Error already shown in celerManager
            }
        }),

        vscode.commands.registerCommand('celer.reverse', async () => {
            const packageName = await vscode.window.showInputBox({
                prompt: 'Enter package name to show reverse dependencies',
                placeHolder: 'package-name',
                validateInput: (value) => {
                    return value.trim() ? null : 'Package name is required';
                }
            });

            if (packageName) {
                try {
                    await celerManager.reverse(packageName);
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        }),

        vscode.commands.registerCommand('celer.clean', async () => {
            const confirmation = await vscode.window.showWarningMessage(
                'This will remove build cache and clean source repository. Continue?',
                'Yes', 'No'
            );

            if (confirmation === 'Yes') {
                try {
                    await celerManager.clean();
                    vscode.window.showInformationMessage('Build cache cleaned successfully');
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        }),

        vscode.commands.registerCommand('celer.autoremove', async () => {
            const confirmation = await vscode.window.showWarningMessage(
                'This will remove project not required libraries. Continue?',
                'Yes', 'No'
            );

            if (confirmation === 'Yes') {
                try {
                    await celerManager.autoremove();
                    dependencyTreeProvider.refresh();
                    vscode.window.showInformationMessage('Unused libraries removed successfully');
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        }),

        vscode.commands.registerCommand('celer.version', async () => {
            try {
                await celerManager.version();
            } catch (error) {
                // Error already shown in celerManager
            }
        })
    );
}

