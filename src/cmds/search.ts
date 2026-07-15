import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Celer } from '../celer';

/**
 * Search available ports from ports repository with interactive filtering.
 */
export function registerSearchCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.search', async () => {
        const availablePorts = await celer.getAvailablePorts();
        if (availablePorts.length === 0) {
            vscode.window.showWarningMessage('No ports found in ports directory');
            return;
        }

        const allItems = availablePorts.map(pkg => {
            const [name, version] = pkg.split('@');
            return { label: name, description: version, fullName: pkg };
        });

        const qp = vscode.window.createQuickPick<(typeof allItems)[0]>();
        qp.title = 'Celer Search Ports';
        qp.placeholder = 'Type to search ports (e.g. zlib, eigen, boost)';
        qp.matchOnDescription = true;
        qp.matchOnDetail = true;
        qp.items = [];

        // Only show items when user types (avoid showing all 393 at once)
        qp.onDidChangeValue(value => {
            const lower = value.toLowerCase();
            qp.items = lower
                ? allItems.filter(i =>
                    i.label.toLowerCase().includes(lower) ||
                    i.description.toLowerCase().includes(lower))
                : [];
        });

        qp.onDidAccept(async () => {
            const selected = qp.selectedItems[0];
            if (!selected) { return; }
            qp.hide();

            // Try to open the port TOML file
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceFolder) {
                const firstLetter = selected.label[0].toLowerCase();
                const portTomlPath = path.join(
                    workspaceFolder, 'ports', firstLetter,
                    selected.label, selected.description, 'port.toml'
                );
                if (fs.existsSync(portTomlPath)) {
                    const doc = await vscode.workspace.openTextDocument(portTomlPath);
                    await vscode.window.showTextDocument(doc);
                } else {
                    // Also run celer search to show details
                    await celer.runCommand(['search', selected.fullName]);
                    celer.showOutput();
                }
            }
        });

        qp.onDidHide(() => qp.dispose());
        qp.show();
    }));
}
