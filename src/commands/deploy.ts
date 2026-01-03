import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Deploy with selected platform and project
 */
export function registerDeployCommand(
    context: vscode.ExtensionContext,
    celer: Celer
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.deploy', async () => {
            const confirmation = await vscode.window.showInformationMessage(
                'Deploy project with selected platform and project configuration?',
                'Deploy', 'Cancel'
            );

            if (confirmation === 'Deploy') {
                try {
                    await celer.deploy();
                    vscode.window.showInformationMessage('Project deployed successfully');
                } catch (error) {
                    // Error already shown in celerManager
                }
            }
        })
    );
}
