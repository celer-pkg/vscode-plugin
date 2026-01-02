import * as vscode from 'vscode';
import { Celer } from '../celer';
import { DependencyTreeProvider } from '../dependencyTreeProvider';

/**
 * Register package management commands (install, add, remove, update)
 */
export function registerPackageCommands(
    context: vscode.ExtensionContext,
    celerManager: Celer,
    dependencyTreeProvider: DependencyTreeProvider
): void {
    
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.install', async () => {
            try {
                await celerManager.install();
                dependencyTreeProvider.refresh();
            } catch (error) {
                // Error already shown in celerManager
            }
        }),

        vscode.commands.registerCommand('celer.add', async () => {
            const packageName = await vscode.window.showInputBox({
                prompt: 'Enter package name',
                placeHolder: 'package-name',
                validateInput: (value) => {
                    return value.trim() ? null : 'Package name cannot be empty';
                }
            });

            if (packageName) {
                try {
                    await celerManager.add(packageName);
                    dependencyTreeProvider.refresh();
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        }),

        vscode.commands.registerCommand('celer.remove', async (item?: any) => {
            let packageName: string | undefined;

            if (item && item.name) {
                // Called from tree view context menu
                packageName = item.name;
            } else {
                // Called from command palette
                packageName = await vscode.window.showInputBox({
                    prompt: 'Enter package name to remove',
                    placeHolder: 'package-name'
                });
            }

            if (packageName) {
                const confirmation = await vscode.window.showWarningMessage(
                    `Are you sure you want to remove ${packageName}?`,
                    'Yes', 'No'
                );

                if (confirmation === 'Yes') {
                    try {
                        await celerManager.remove(packageName);
                        dependencyTreeProvider.refresh();
                    } catch (error) {
                        // Error already shown in celerManager
                    }
                }
            }
        }),

        vscode.commands.registerCommand('celer.update', async (item?: any) => {
            let packageName: string | undefined;

            if (item && item.name) {
                // Called from tree view context menu
                packageName = item.name;
            } else {
                // Called from command palette
                packageName = await vscode.window.showInputBox({
                    prompt: 'Enter package name to update',
                    placeHolder: 'package-name'
                });
            }

            if (packageName) {
                try {
                    await celerManager.update(packageName);
                    dependencyTreeProvider.refresh();
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        })
    );
}
