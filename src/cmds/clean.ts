import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Remove build cache and clean source repository
 */
export function registerCleanCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.clean', async () => {
        const confirmation = await vscode.window.showWarningMessage(
            'This will remove build cache and clean source repository. Continue?',
            'Yes', 'No'
        );

        if (confirmation === 'Yes') {
            try {
                await celer.runCommand(['clean']);
                vscode.window.showInformationMessage('Build cache cleaned successfully');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to clean: ${error}`);
            }
        }
    })
    );
}
