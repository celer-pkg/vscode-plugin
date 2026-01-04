import * as vscode from 'vscode';
import { Celer } from './celer';
import { StatusBarManager } from './statusbar';
import { CelerInstaller } from './installer';
import {
    registerInitCommand,
    registerInstallCommand,
    registerRemoveCommand,
    registerUpdateCommand,
    registerSearchCommand,
    registerCleanCommand,
    registerAutoremoveCommand,
    registerTreeCommand,
    registerReverseCommand,
    registerDeployCommand,
    registerCreateCommand,
    registerConfigureCommand,
    registerVersionCommand,
    registerSelectCommands,
    registerSelectJobsCommand
} from './cmds';

let celer: Celer;
let statusBarManager: StatusBarManager;
let celerInstaller: CelerInstaller;

export async function activate(context: vscode.ExtensionContext) {
    // Initialize managers
    celer = new Celer();
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
            // true = auto install without prompt
            const installed = await celerInstaller.ensureCelerInstalled(true);
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
    registerInitCommand(context, celer);
    registerInstallCommand(context, celer);
    registerRemoveCommand(context, celer);
    registerUpdateCommand(context, celer);
    registerSearchCommand(context, celer);
    registerCleanCommand(context, celer);
    registerAutoremoveCommand(context, celer);
    registerTreeCommand(context, celer);
    registerReverseCommand(context, celer);
    registerDeployCommand(context, celer);
    registerCreateCommand(context, celer);
    registerConfigureCommand(context, celer);
    registerVersionCommand(context, celer);
    registerSelectCommands(context, celer, statusBarManager);
    registerSelectJobsCommand(context, celer, statusBarManager);

    // Auto-install if enabled
    const config = vscode.workspace.getConfiguration('celer');
    if (hasCelerProject && config.get('autoInstall', false)) {
        await celer.runCommand(['install']);
    }

    // Watch for celer.toml changes
    const watcher = vscode.workspace.createFileSystemWatcher('celer.toml');

    watcher.onDidChange(async () => {
        await statusBarManager.updateStatusBarItems();
    });

    watcher.onDidCreate(async () => {
        vscode.commands.executeCommand('setContext', 'celer.hasCelerProject', true);
        statusBarManager.createStatusBarItems();
        await statusBarManager.updateStatusBarItems();
    });

    watcher.onDidDelete(async () => {
        const stillHasProject = await celer.hasCelerProject();
        vscode.commands.executeCommand('setContext', 'celer.hasCelerProject', stillHasProject);
        if (!stillHasProject) {
            statusBarManager.dispose();
        }
    });

    context.subscriptions.push(watcher);
}

export function deactivate() {
    if (statusBarManager) {
        statusBarManager.dispose();
    }
}
