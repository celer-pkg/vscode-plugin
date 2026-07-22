import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Remove installed packages, optionally with their dependencies, build cache, and package files.
 */
export function registerRemoveCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.remove', async () => {
        // Get installed packages (filtered by current platform/build_type/project)
        const config = await celer.readCelerConfig().catch(() => undefined);
        const installedPackages = await celer.getInstalledPackages();
        if (installedPackages.length === 0) {
            const hint = config ? ` (platform: ${config.currentPlatform || '?'}, build: ${config.currentBuildType || '?'}, project: ${config.currentProject || '?'})` : '';
            vscode.window.showWarningMessage(`No installed packages found${hint}`);
            return;
        }

        // Create quick pick with all packages pre-populated
        const quickPick = vscode.window.createQuickPick();
        quickPick.title = `Remove Package (${installedPackages.length} installed)`;
        quickPick.placeholder = 'Type to filter installed packages (supports wildcards * and ?)';
        quickPick.matchOnDescription = true;

        const createPkgItems = (pkgs: string[], filterPattern: string) => {
            const pattern = filterPattern.replace(/\*/g, '.*').replace(/\?/g, '.');
            const regex = new RegExp(pattern, 'i');
            return pkgs.filter(pkg => regex.test(pkg)).slice(0, 100).map(pkg => {
                return { label: `$(package) ${pkg}`, pkgFullName: pkg };
            });
        };

        // Show all by default
        quickPick.items = createPkgItems(installedPackages, '*');
        quickPick.onDidChangeValue((value) => {
            quickPick.items = value ? createPkgItems(installedPackages, value) : createPkgItems(installedPackages, '*');
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
                { label: '$(layers) Recursive', description: 'Remove package dependencies recursively (--recursive)', picked: false, flag: '--recursive' },
                { label: '$(trash) Build Cache', description: 'Remove build cache along with the package (--build-cache)', picked: false, flag: '--build-cache' },
                { label: '$(file) Purge', description: 'Purge package files completely (--purge)', picked: false, flag: '--purge' },
                { label: '$(beaker) Dev', description: 'Remove from development dependencies (--dev)', picked: false, flag: '--dev' }
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
