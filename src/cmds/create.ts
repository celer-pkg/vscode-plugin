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

            // Poll for the created file to appear (up to 10s)
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceFolder) {
                const tomlPath = await waitForCreatedFile(workspaceFolder, createType.value, name);
                if (tomlPath) {
                    const doc = await vscode.workspace.openTextDocument(tomlPath);
                    await vscode.window.showTextDocument(doc);
                } else {
                    const [pn, pv] = name.split('@');
                    const hint = createType.value === 'port' && pn && pv
                        ? `ports/${pn.charAt(0).toLowerCase()}/${pn}/${pv}/`
                        : `conf/${createType.value}s/`;
                    vscode.window.showWarningMessage(
                        `${createType.label} created but file not detected. Check ${hint} directory.`
                    );
                }
            }
        }
    })
    );
}

/** Poll for a created file to appear, returns path or undefined after timeout */
async function waitForCreatedFile(workspace: string, type: string, name: string): Promise<string | undefined> {
    const searchDir = getSearchDir(workspace, type, name);

    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));

        // Check exact path first
        const exact = resolveCreatedPath(workspace, type, name);
        if (exact && fs.existsSync(exact)) { return exact; }

        // Fuzzy: find newest file in expected directory tree
        const fuzzy = findCreatedFile(searchDir);
        if (fuzzy) { return fuzzy; }
    }
    return undefined;
}

function getSearchDir(workspace: string, type: string, name: string): string {
    if (type === 'platform') { return path.join(workspace, 'conf', 'platforms'); }
    if (type === 'project') { return path.join(workspace, 'conf', 'projects'); }
    // ports are stored under first-letter subdirectory: ports/o/opencv/
    return path.join(workspace, 'ports');
}

/** Resolve the expected path for a created entity */
function resolveCreatedPath(workspace: string, type: string, name: string): string | undefined {
    if (type === 'platform') {
        return path.join(workspace, 'conf', 'platforms', `${name}.toml`);
    }
    if (type === 'project') {
        return path.join(workspace, 'conf', 'projects', `${name}.toml`);
    }
    // port: stored as ports/<first-letter>/<name>/<version>/port.toml
    const [portName, version] = name.split('@');
    if (!portName || !version) { return undefined; }
    const portDir = path.join(workspace, 'ports', portName.charAt(0).toLowerCase(), portName, version);
    return path.join(portDir, 'port.toml');
}

/** Find the most recently modified file in a directory (recursive for ports) */
function findCreatedFile(searchDir: string): string | undefined {
    try {
        if (!fs.existsSync(searchDir)) { return undefined; }
        const files: string[] = [];
        collectFiles(searchDir, files);
        if (files.length === 0) { return undefined; }
        files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
        return files[0];
    } catch {
        return undefined;
    }
}

function collectFiles(dir: string, result: string[]): void {
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isFile()) { result.push(full); }
            else if (entry.isDirectory()) { collectFiles(full, result); }
        }
    } catch { /* skip */ }
}
