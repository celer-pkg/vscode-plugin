import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Clean installed directory, remove project not required libraries
 */
export function registerAutoremoveCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.autoremove', async () => {
        // Show options for multi-select
        const options = await vscode.window.showQuickPick(
            [
                { label: '$(trash) Build Cache', description: 'Remove packages along with build cache (--build-cache)', picked: false, flag: '--build-cache' },
                { label: '$(file) Purge', description: 'Remove packages along with its package file (--purge)', picked: false, flag: '--purge' }
            ],
            { 
                placeHolder: 'Select autoremove options (multi-select, or skip for normal autoremove)',
                canPickMany: true 
            }
        );

        if (options === undefined) {
            return; // User cancelled
        }

        // Build command arguments
        const args: string[] = ['autoremove'];
        
        // Add selected flags
        for (const opt of options) {
            args.push((opt as any).flag);
        }

        await celer.runCommandInTerminal(args);
    })
    );
}
