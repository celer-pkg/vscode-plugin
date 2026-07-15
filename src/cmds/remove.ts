import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Remove installed packages, optionally with their dependencies, build cache, and package files.
 */
export function registerRemoveCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.remove', async () => {
        // Get installed packages for selection
        const installedPackages = await celer.getInstalledPackages();
        if (installedPackages.length === 0) {
            vscode.window.showWarningMessage('No installed packages found');
            return;
        }

        // Create quick pick for searching packages
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Type to search installed packages (supports wildcards)';
        quickPick.matchOnDescription = true;

        const createPkgItems = (pkgs: string[], filterPattern: string) => {
            const pattern = filterPattern.replace(/\*/g, '.*').replace(/\?/g, '.');
            const regex = new RegExp(pattern, 'i');
            return pkgs.filter(pkg => regex.test(pkg)).slice(0, 100).map(pkg => {
                const [name, version] = pkg.split('@');
                return { label: `$(package) ${name}`, description: version || '', pkgFullName: pkg };
            });
        };

        quickPick.items = [];
        quickPick.onDidChangeValue((value) => {
            quickPick.items = value ? createPkgItems(installedPackages, value) : [];
        });

        const selected = await new Promise<any>((resolve) => {
            quickPick.onDidAccept(() => { const item = quickPick.selectedItems[0]; quickPick.hide(); resolve(item); });
            quickPick.onDidHide(() => resolve(undefined));
            quickPick.show();
        });

        if (!selected) { return; }

        const packageName = selected.pkgFullName;

        // Show remove options
        const options = await vscode.window.showQuickPick(
            [
                { label: '$(layers) Recursive', description: 'Remove package dependencies recursively (-r)', picked: false, flag: '-r' },
                { label: '$(trash) Build Cache', description: 'Remove build cache along with the package (-c)', picked: false, flag: '-c' },
                { label: '$(file) Purge', description: 'Purge package files completely (-p)', picked: false, flag: '-p' },
                { label: '$(beaker) Dev', description: 'Remove from development dependencies (-d)', picked: false, flag: '-d' }
            ],
            { placeHolder: 'Select removal options (multi-select, or skip for normal remove)', canPickMany: true }
        );

        if (options === undefined) { return; }

        const confirmation = await vscode.window.showWarningMessage(
            `Are you sure you want to remove ${packageName}?`, 'Yes', 'No'
        );

        if (confirmation !== 'Yes') { return; }

        const args: string[] = ['remove'];
        for (const opt of options) { args.push((opt as any).flag); }
        args.push(packageName);

        await celer.runCommandInTerminal(args);
    }));
}
