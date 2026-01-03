import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Show version info of celer
 */
export function registerVersionCommand(
    context: vscode.ExtensionContext,
    celer: Celer
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.version', async () => {
            try {
                await celer.version();
            } catch (error) {
                // Error already shown in celerManager
            }
        })
    );
}
