import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Celer } from '../celer';

/**
 * Create a platform, project or port
 */
export function registerCreateCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.create', async () => {
        const createType = await vscode.window.showQuickPick(
            [
                { label: 'Platform', value: 'platform', description: 'Create a new platform' },
                { label: 'Project', value: 'project', description: 'Create a new project' },
                { label: 'Port', value: 'port', description: 'Create a new port' }
            ],
            { placeHolder: 'What do you want to create?' }
        );

        if (!createType) {
            return;
        }

        const name = await vscode.window.showInputBox({
            prompt: `Enter ${createType.label.toLowerCase()} name${createType.value === 'port' ? ' (format: name@version)' : ''}`,
            placeHolder: createType.value === 'port' ? 'opencv@4.8.0' : `my-${createType.value}`,
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'Name is required';
                }
                if (createType.value === 'port' && !value.includes('@')) {
                    return 'Port name must include version (format: name@version)';
                }
                return null;
            }
        });

        if (name) {
            // Execute create command in terminal
            await celer.runCommandInTerminal(['create', `--${createType.value}=${name}`]);

            // Wait for command to complete and file to be created
            await new Promise(resolve => setTimeout(resolve, 2500));

            // Try to open the newly created toml file
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceFolder) {
                let tomlPath = '';
                if (createType.value === 'platform') {
                    tomlPath = path.join(workspaceFolder, 'conf', 'platforms', `${name}.toml`);
                } else if (createType.value === 'project') {
                    tomlPath = path.join(workspaceFolder, 'conf', 'projects', `${name}.toml`);
                } else if (createType.value === 'port') {
                    const portName = name.split('@')[0];
                    tomlPath = path.join(workspaceFolder, 'ports', portName, `${portName}.toml`);
                }
                
                if (tomlPath && fs.existsSync(tomlPath)) {
                    try {
                        const doc = await vscode.workspace.openTextDocument(tomlPath);
                        await vscode.window.showTextDocument(doc);
                    } catch (error) {
                        vscode.window.showWarningMessage(`File created but could not be opened: ${error}`);
                    }
                } else if (tomlPath) {
                    // If file doesn't exist after waiting, show a message
                    vscode.window.showWarningMessage(`File was not found at ${tomlPath}. Check terminal for errors.`);
                }
            }
        }
    })
    );
}
