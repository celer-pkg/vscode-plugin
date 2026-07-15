import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Search available ports from ports repository.
 * Uses the celer search CLI which supports wildcard matching.
 */
export function registerSearchCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.search', async () => {
        // Ask for search pattern with examples
        const pattern = await vscode.window.showInputBox({
            prompt: 'Enter search pattern (supports wildcards: *, ?)',
            placeHolder: 'e.g., zlib*, *@1.3.1, *ffmpeg*',
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'Search pattern is required';
                }
                return null;
            }
        });

        if (!pattern) { return; }

        try {
            // Run celer search and capture output
            const output = await celer.runCommand(['search', pattern.trim()]);
            
            // Show results in output channel
            celer.showOutput();
            
            if (!output.trim()) {
                vscode.window.showInformationMessage(`No ports found matching "${pattern}"`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Search failed: ${error}`);
        }
    }));
}
