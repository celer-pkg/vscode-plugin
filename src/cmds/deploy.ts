import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Deploy with selected platform and project. Supports --force, --snapshot, --strip.
 */
export function registerDeployCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.deploy', async () => {
        // Show deploy options
        const options = await vscode.window.showQuickPick(
            [
                { label: '$(warning) Force', description: 'Force deployment, ignoring installed packages (--force)', picked: false, flag: '--force' },
                { label: '$(file-binary) Strip', description: 'Strip installed binaries and libraries (--strip)', picked: false, flag: '--strip' },
                { label: '$(save-as) Snapshot', description: 'Export workspace snapshot after deploy (--snapshot)', picked: false, flag: '--snapshot' }
            ],
            { placeHolder: 'Select deploy options (multi-select, or skip for normal deploy)', canPickMany: true }
        );

        if (options === undefined) { return; }

        const args: string[] = ['deploy'];
        for (const opt of options) {
            if ((opt as any).flag === '--snapshot') {
                const filePath = await vscode.window.showInputBox({
                    prompt: 'Enter snapshot file path',
                    placeHolder: './snapshot.json'
                });
                if (filePath) {
                    args.push(`--snapshot=${filePath}`);
                }
            } else {
                args.push((opt as any).flag);
            }
        }

        const confirmation = await vscode.window.showInformationMessage(
            'Deploy project with selected platform and project configuration?',
            'Deploy', 'Cancel'
        );

        if (confirmation === 'Deploy') {
            await celer.runCommandInTerminal(args);
        }
    }));
}
