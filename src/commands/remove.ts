import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Remove installed packages
 */
export function registerRemoveCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.remove', async () => {
        const packageName = await vscode.window.showInputBox({
            prompt: 'Enter package name to remove',
            placeHolder: 'package-name'
        });

        if (packageName) {
            const confirmation = await vscode.window.showWarningMessage(
                `Are you sure you want to remove ${packageName}?`,
                'Yes', 'No'
            );

            if (confirmation === 'Yes') {
                try {
                    await celer.runCommand(['remove', packageName]);
                    vscode.window.showInformationMessage(`Package ${packageName} removed successfully`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to remove package: ${error}`);
                }
            }
        }
    })
    );
}
