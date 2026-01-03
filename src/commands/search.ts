import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Search available ports from ports repository
 */
export function registerSearchCommand(
    context: vscode.ExtensionContext,
    celer: Celer
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.search', async () => {
            const searchQuery = await vscode.window.showInputBox({
                prompt: 'Enter package name to search',
                placeHolder: 'package-name'
            });

            if (searchQuery) {
                try {
                    const packages = await celer.search(searchQuery);
                    
                    if (packages.length === 0) {
                        vscode.window.showInformationMessage(`No packages found matching "${searchQuery}"`);
                        return;
                    }

                    const selected = await vscode.window.showQuickPick(
                        packages.map(pkg => ({
                            label: pkg.name,
                            description: pkg.version,
                            detail: pkg.description,
                            pkg: pkg
                        })),
                        {
                            placeHolder: 'Search results - Select a package to install'
                        }
                    );

                    if (selected) {
                        const action = await vscode.window.showInformationMessage(
                            `Add ${selected.label} to project?`,
                            'Add Port', 'Cancel'
                        );

                        if (action === 'Add Port') {
                            // Format as name@version for port creation
                            const portRef = `${selected.pkg.name}@${selected.pkg.version}`;
                            await celer.create('port', portRef);
                        }
                    }
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        })
    );
}
