import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Install all dependencies from celer.toml
 */
export function registerInstallCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.install', async () => {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Installing Celer dependencies...',
                cancellable: false
            }, async () => {
                await celer.runCommand(['install']);
            });
            vscode.window.showInformationMessage('Dependencies installed successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install dependencies: ${error}`);
        }
    })
    );
}
