import * as vscode from 'vscode';
import { Celer } from '../celer';
import { DependencyTreeProvider } from '../dependencyTreeProvider';

/**
 * Register utility commands (search, refresh)
 */
export function registerUtilityCommands(
    context: vscode.ExtensionContext,
    celerManager: Celer,
    dependencyTreeProvider: DependencyTreeProvider
): void {
    
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
        })
    );
}

