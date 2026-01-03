import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Clean installed directory, remove project not required libraries
 */
export function registerAutoremoveCommand(    context: vscode.ExtensionContext,    celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.autoremove', async () => {
        const confirmation = await vscode.window.showWarningMessage(
            'This will remove project not required libraries. Continue?',
            'Yes', 'No'
        );

        if (confirmation === 'Yes') {
            try {
                await celer.runCommand(['autoremove']);
                vscode.window.showInformationMessage('Unused libraries removed successfully');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to autoremove: ${error}`);
            }
        }
    })
    );
}
