import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Show the dependency tree of a package or project
 */
export function registerTreeCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.tree', async () => {
        const packageName = await vscode.window.showInputBox({
            prompt: 'Enter package name to show dependency tree (leave empty for project tree)',
            placeHolder: 'package-name (optional)'
        });

        try {
            const args = ['tree'];
            if (packageName) {
                args.push(packageName);
            }
            await celer.runCommandInTerminal(args);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show tree: ${error}`);
        }
    })
    );
}
