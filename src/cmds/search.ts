import * as vscode from 'vscode';
import { Celer, Package } from '../celer';

// Parse search output
function parseSearchOutput(output: string): Package[] {
    const packages: Package[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
        // Try to parse lines like "package-name version - description"
        const match = line.match(/^([\w-]+)\s+([\d.]+)(?:\s+-\s+(.+))?$/);
        if (match) {
            packages.push({
                name: match[1],
                version: match[2],
                description: match[3]
            });
        }
    }

    return packages;
}

/**
 * Search available ports from ports repository
 */
export function registerSearchCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.search', async () => {
        const searchQuery = await vscode.window.showInputBox({
            prompt: 'Enter package name to search',
            placeHolder: 'package-name'
        });

        if (searchQuery) {
            try {
                let packages: Package[] = [];

                // Try JSON format first
                try {
                    const output = await celer.runCommand(['search', searchQuery, '--format', 'json']);
                    packages = JSON.parse(output);
                } catch (error) {
                    // Fallback to plain text parsing
                    const output = await celer.runCommand(['search', searchQuery]);
                    packages = parseSearchOutput(output);
                }

                if (packages.length === 0) {
                    vscode.window.showInformationMessage(`No packages found matching "${searchQuery}"`);
                    return;
                }

                const selected = await vscode.window.showQuickPick(
                    packages.map(pkg => ({
                        label: pkg.name,
                        description: pkg.version,
                        detail: pkg.description,
                        pkg: pkg
                    })),
                    {
                        placeHolder: 'Search results - Select a package to install'
                    }
                );

                if (selected) {
                    const action = await vscode.window.showInformationMessage(
                        `Add ${selected.label} to project?`,
                        'Add Port', 'Cancel'
                    );

                    if (action === 'Add Port') {
                        // Format as name@version for port creation
                        const portRef = `${selected.pkg.name}@${selected.pkg.version}`;
                        await celer.runCommand(['create', '--port', portRef]);
                        vscode.window.showInformationMessage(`Port ${portRef} added successfully`);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to search packages: ${error}`);
            }
        }
    })
    );
}
