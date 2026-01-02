import * as vscode from 'vscode';
import { Celer } from './celer';
import { DependencyTreeProvider } from './dependencyTreeProvider';
import { StatusBarManager } from './statusBarManager';
import { CelerInstaller } from './installer';
import { registerConfigCommands } from './commands/configCommands';
import { registerPackageCommands } from './commands/packageCommands';
import { registerUtilityCommands } from './commands/utilityCommands';

let celer: Celer;
let dependencyTreeProvider: DependencyTreeProvider;
let statusBarManager: StatusBarManager;
let celerInstaller: CelerInstaller;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Celer Package Manager extension is now active');

    // Initialize managers
    celer = new Celer();
    dependencyTreeProvider = new DependencyTreeProvider(celer);
    statusBarManager = new StatusBarManager(celer, context);
    celerInstaller = new CelerInstaller(celer.getOutputChannel());

    // Check if this is the first time the extension is activated
    const isFirstRun = context.globalState.get<boolean>('celer.firstRun', true);
    
    if (isFirstRun && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        // First time setup - auto download and integrate celer
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Celer Extension - First Time Setup',
            cancellable: false
        }, async (progress) => {
            progress.report({ message: 'Checking for Celer executable...' });
            const installed = await celerInstaller.ensureCelerInstalled(true); // true = auto install without prompt
            if (installed) {
                vscode.window.showInformationMessage('Celer extension initialized successfully!');
            }
        });
        
        // Mark as no longer first run
        await context.globalState.update('celer.firstRun', false);
    }

    // Check if Celer project exists and update context
    const hasCelerProject = await celer.hasCelerProject();
    vscode.commands.executeCommand('setContext', 'celer.hasCelerProject', hasCelerProject);

    // Ensure Celer is installed if project exists (but not first run)
    if (hasCelerProject && !isFirstRun) {
        const celerInstalled = await celerInstaller.ensureCelerInstalled(false); // false = prompt user
        if (!celerInstalled) {
            vscode.window.showWarningMessage('Celer is not installed. Some features may not work.');
        }
    }

    // Create status bar items (bottom bar UI)
    if (hasCelerProject) {
        statusBarManager.createStatusBarItems();
    }

    // Register tree view
    const treeView = vscode.window.createTreeView('celerDependencies', {
        treeDataProvider: dependencyTreeProvider,
        showCollapseAll: true
    });

    // Register installer commands
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.installCelerExecutable', async () => {
            await celerInstaller.ensureCelerInstalled(true); // Force install without prompt
        }),

        vscode.commands.registerCommand('celer.resetFirstRun', async () => {
            await context.globalState.update('celer.firstRun', true);
            vscode.window.showInformationMessage('First run status reset. Please reload the window.');
        })
    );

    // Register all command modules
    registerPackageCommands(context, celer, dependencyTreeProvider);
    registerUtilityCommands(context, celer, dependencyTreeProvider);
    registerConfigCommands(context, celer, async () => {
        await statusBarManager.updateStatusBarItems();
    });

    context.subscriptions.push(treeView);

    // Auto-install if enabled
    const config = vscode.workspace.getConfiguration('celer');
    if (hasCelerProject && config.get('autoInstall', false)) {
        await celer.install();
        dependencyTreeProvider.refresh();
    }

    // Watch for celer.toml changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/{celer,Celer}.toml');
    watcher.onDidChange(() => dependencyTreeProvider.refresh());
    watcher.onDidCreate(async () => {
        vscode.commands.executeCommand('setContext', 'celer.hasCelerProject', true);
        dependencyTreeProvider.refresh();
    });
    watcher.onDidDelete(async () => {
        const stillHasProject = await celer.hasCelerProject();
        vscode.commands.executeCommand('setContext', 'celer.hasCelerProject', stillHasProject);
        dependencyTreeProvider.refresh();
    });
    context.subscriptions.push(watcher);
}

export function deactivate() {
    // Clean up status bar manager
    if (statusBarManager) {
        statusBarManager.dispose();
    }
}
