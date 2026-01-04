import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Show version info of celer
 */
export function registerVersionCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.version', async () => {
        try {
            await celer.runCommandInTerminal(['version']);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get version: ${error}`);
        }
    })
    );
}
