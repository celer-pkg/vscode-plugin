import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Initialize celer with configuration repository
 */
export function registerInitCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.init', async () => {
        // Try to get the conf repository URL as default value
        const defaultUrl = await celer.getConfRepositoryUrl();
        
        const url = await vscode.window.showInputBox({
            prompt: 'Enter configuration repository URL',
            placeHolder: 'https://github.com/example/conf',
            value: defaultUrl, // Pre-fill with conf repo URL if available
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

        // Try to get the current branch from conf repository
        const defaultBranch = await celer.getConfRepositoryBranch();

        const branch = await vscode.window.showInputBox({
            prompt: 'Enter branch name (optional, press Enter to use default)',
            placeHolder: 'main',
            value: defaultBranch // Pre-fill with current branch if available
        });

        // Check if conf repository has local changes
        const hasChanges = await celer.hasConfRepositoryChanges();
        
        let forceInit = false;
        if (hasChanges) {
            const forceOptions = await vscode.window.showQuickPick(
                [
                    { label: 'Normal initialization', value: false, description: 'Will fail if conf has local changes' },
                    { label: 'Force re-initialize', value: true, description: 'Overwrite existing configuration and local changes' }
                ],
                { placeHolder: 'Conf repository has local changes. Select initialization mode' }
            );

            if (!forceOptions) {
                return;
            }
            forceInit = forceOptions.value;
        }

        const args = ['init', `-u=${url}`];
        if (branch) {
            args.push(`-b=${branch}`);
        }
        if (forceInit) {
            args.push('-f');
        }
        await celer.runCommandInTerminal(args);
        // Set context after terminal command (assumes success)
        vscode.commands.executeCommand('setContext', 'celer.hasCelerProject', true);
    })
    );
}
