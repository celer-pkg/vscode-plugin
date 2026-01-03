import * as vscode from 'vscode';
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
            try {
                await celer.runCommand(['create', `--${createType.value}`, name]);
                vscode.window.showInformationMessage(`${createType.label} "${name}" created successfully`);

                // 尝试打开新建的 toml 文件
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceFolder) {
                    let tomlPath = '';
                    if (createType.value === 'platform') {
                        tomlPath = vscode.Uri.file(require('path').join(workspaceFolder, 'conf', 'platforms', `${name}.toml`)).fsPath;
                    } else if (createType.value === 'project') {
                        tomlPath = vscode.Uri.file(require('path').join(workspaceFolder, 'conf', 'projects', `${name}.toml`)).fsPath;
                    } else if (createType.value === 'port') {
                        const portName = name.split('@')[0];
                        tomlPath = vscode.Uri.file(require('path').join(workspaceFolder, 'ports', portName, `${portName}.toml`)).fsPath;
                    }
                    if (tomlPath && require('fs').existsSync(tomlPath)) {
                        const doc = await vscode.workspace.openTextDocument(tomlPath);
                        await vscode.window.showTextDocument(doc);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to create ${createType.value}: ${error}`);
            }
        }
    })
    );
}
