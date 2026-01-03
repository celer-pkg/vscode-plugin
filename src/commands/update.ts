import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Update conf repo, ports config repo or project repo
 */
export function registerUpdateCommand(
    context: vscode.ExtensionContext,
    celer: Celer
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.update', async () => {
            const updateType = await vscode.window.showQuickPick(
                [
                    { label: 'Update specific package', value: 'package' },
                    { label: 'Update all', value: 'all' }
                ],
                { placeHolder: 'What do you want to update?' }
            );

            if (!updateType) {
                return;
            }

            let packageName: string | undefined;
            if (updateType.value === 'package') {
                packageName = await vscode.window.showInputBox({
                    prompt: 'Enter package name to update',
                    placeHolder: 'package-name'
                });

                if (!packageName) {
                    return;
                }
            }

            try {
                await celer.update(packageName);
            } catch (error) {
                // Error already shown in celerManager
            }
        })
    );
}
