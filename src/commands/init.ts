import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Initialize celer with configuration repository
 */
export function registerInitCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.init', async () => {
        const url = await vscode.window.showInputBox({
            prompt: 'Enter configuration repository URL',
            placeHolder: 'https://github.com/example/conf',
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'Repository URL is required';
                }
                try {
                    new URL(value);
                    return null;
                } catch {
                    return 'Please enter a valid URL';
                }
            }
        });

        if (!url) {
            return;
        }

        const branch = await vscode.window.showInputBox({
            prompt: 'Enter branch name (optional, press Enter to use default)',
            placeHolder: 'main'
        });

        const forceOptions = await vscode.window.showQuickPick(
            [
                { label: 'Normal initialization', value: false },
                { label: 'Force re-initialize', value: true, description: 'Overwrite existing configuration' }
            ],
            { placeHolder: 'Select initialization mode' }
        );

        if (forceOptions) {
            try {
                const args = ['init', '--url', url];
                if (branch) {
                    args.push('--branch', branch);
                }
                if (forceOptions.value) {
                    args.push('--force');
                }
                await celer.runCommand(args);
                vscode.window.showInformationMessage('Celer project initialized successfully');
                vscode.commands.executeCommand('setContext', 'celer.hasCelerProject', true);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to initialize project: ${error}`);
            }
        }
    })
    );
}
