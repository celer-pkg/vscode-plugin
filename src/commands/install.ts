import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Install all dependencies from celer.toml
 */
export function registerInstallCommand(
    context: vscode.ExtensionContext,
    celer: Celer
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.install', async () => {
            try {
                await celer.install();
            } catch (error) {
                // Error already shown in celerManager
            }
        })
    );
}
