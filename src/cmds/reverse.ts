import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Query libraries that depend on the specified package
 */
export function registerReverseCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.reverse', async () => {
        const packageName = await vscode.window.showInputBox({
            prompt: 'Enter package name to show reverse dependencies',
            placeHolder: 'package-name',
            validateInput: (value) => {
                return value.trim() ? null : 'Package name is required';
            }
        });

        if (packageName) {
            try {
                await celer.runCommandInTerminal(['reverse', packageName]);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show reverse dependencies: ${error}`);
            }
        }
    })
    );
}
