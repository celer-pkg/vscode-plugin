import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Update conf repo, ports config repo or project repo
 */
export function registerUpdateCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.update', async () => {
        const updateType = await vscode.window.showQuickPick(
            [
                { label: '$(cloud-download) Update Conf Repository', value: 'conf-repo', description: 'Update configuration files repository' },
                { label: '$(package) Update Ports Repository', value: 'ports-repo', description: 'Update ports configuration repository' },
                { label: '$(library) Update Port Repos', value: 'ports', description: 'Update third-party library source repositories' }
            ],
            { placeHolder: 'What do you want to update?' }
        );

        if (!updateType) {
            return;
        }

        switch (updateType.value) {
            case 'conf-repo':
                // Update conf repository
                await celer.runCommandInTerminal(['update', '--conf-repo']);
                break;

            case 'ports-repo':
                // Update ports repository
                await celer.runCommandInTerminal(['update', '--ports-repo']);
                break;

            case 'ports': {
                const installedPackages = await celer.getInstalledPackages();
                if (installedPackages.length === 0) {
                    vscode.window.showWarningMessage('No installed packages found in buildtrees directory');
                    return;
                }

                const allItems = installedPackages.map(pkg => ({ label: pkg }));
                const selectedLabels = new Set<string>();

                const qp = vscode.window.createQuickPick<(typeof allItems)[0]>();
                qp.title = 'Celer Update Ports';
                qp.placeholder = 'Type to search, Space to select';
                qp.canSelectMany = true;
                qp.items = allItems;

                // Manual filter since canSelectMany disables built-in filter
                qp.onDidChangeValue(value => {
                    const lower = value.toLowerCase();
                    qp.items = lower
                        ? allItems.filter(i => i.label.toLowerCase().includes(lower))
                        : allItems;
                    // Restore previous selections
                    qp.selectedItems = qp.items.filter(i => selectedLabels.has(i.label));
                });

                qp.onDidChangeSelection(sel => {
                    selectedLabels.clear();
                    for (const s of sel) { selectedLabels.add(s.label); }
                });

                const selectedPackages = await new Promise<{ label: string }[]>(resolve => {
                    qp.onDidAccept(() => resolve([...qp.selectedItems]));
                    qp.onDidHide(() => { qp.dispose(); resolve([]); });
                    qp.show();
                });

                if (!selectedPackages || selectedPackages.length === 0) {
                    return;
                }

                // Ask for optional flags (multi-select)
                const options = await vscode.window.showQuickPick(
                    [
                        { label: '$(layers) Recursive', description: 'Update packages and all dependencies (--recursive)', picked: false, flag: '--recursive' },
                        { label: '$(warning) Force', description: 'Force update, overwrites local changes (--force)', picked: false, flag: '--force' }
                    ],
                    { placeHolder: 'Select update options (multi-select, or skip for normal update)', canPickMany: true }
                );

                if (options === undefined) {
                    return;
                }

                // Build command arguments
                const args = ['update'];
                for (const opt of options) { args.push((opt as any).flag); }
                const packageNames = selectedPackages.map(item => item.label);
                args.push(...packageNames);

                // Execute update in terminal
                await celer.runCommandInTerminal(args);
                break;
            }
        }
    })
    );
}
