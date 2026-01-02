import * as vscode from 'vscode';
import { Celer } from './celer';

interface StatusBarItems {
    install: vscode.StatusBarItem;
    add: vscode.StatusBarItem;
    update: vscode.StatusBarItem;
    search: vscode.StatusBarItem;
    outdated: vscode.StatusBarItem;
    platform: vscode.StatusBarItem;
    project: vscode.StatusBarItem;
    buildType: vscode.StatusBarItem;
}

export class StatusBarManager {
    private statusBarItems?: StatusBarItems;

    constructor(
        private celerManager: Celer,
        private context: vscode.ExtensionContext
    ) {}

    createStatusBarItems(): void {
        // Create all status bar items
        this.statusBarItems = {
            platform: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 105),
            project: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 104),
            buildType: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 103),
            install: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100),
            add: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99),
            update: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98),
            search: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97),
            outdated: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 96)
        };

        // Platform selector (leftmost)
        this.statusBarItems.platform.command = 'celer.selectPlatform';
        this.statusBarItems.platform.tooltip = 'Click to select platform';
        this.statusBarItems.platform.show();

        // Project selector
        this.statusBarItems.project.command = 'celer.selectProject';
        this.statusBarItems.project.tooltip = 'Click to select project';
        this.statusBarItems.project.show();

        // Build Type selector
        this.statusBarItems.buildType.command = 'celer.selectBuildType';
        this.statusBarItems.buildType.tooltip = 'Click to select build type';
        this.statusBarItems.buildType.show();

        // Install Dependencies
        this.statusBarItems.install.text = '$(cloud-download) Install';
        this.statusBarItems.install.tooltip = 'Celer: Install Dependencies';
        this.statusBarItems.install.command = 'celer.install';
        this.statusBarItems.install.show();

        // Add Package
        this.statusBarItems.add.text = '$(add) Add';
        this.statusBarItems.add.tooltip = 'Celer: Add Package';
        this.statusBarItems.add.command = 'celer.add';
        this.statusBarItems.add.show();

        // Update Packages
        this.statusBarItems.update.text = '$(sync) Update';
        this.statusBarItems.update.tooltip = 'Celer: Update Package';
        this.statusBarItems.update.command = 'celer.update';
        this.statusBarItems.update.show();

        // Search Packages
        this.statusBarItems.search.text = '$(search) Search';
        this.statusBarItems.search.tooltip = 'Celer: Search Packages';
        this.statusBarItems.search.command = 'celer.search';
        this.statusBarItems.search.show();

        // Check Outdated
        this.statusBarItems.outdated.text = '$(warning) Outdated';
        this.statusBarItems.outdated.tooltip = 'Celer: Check Outdated Packages';
        this.statusBarItems.outdated.command = 'celer.outdated';
        this.statusBarItems.outdated.show();

        // Add to subscriptions
        this.context.subscriptions.push(
            this.statusBarItems.platform,
            this.statusBarItems.project,
            this.statusBarItems.buildType,
            this.statusBarItems.install,
            this.statusBarItems.add,
            this.statusBarItems.update,
            this.statusBarItems.search,
            this.statusBarItems.outdated
        );

        // Update with current values
        this.updateStatusBarItems();
    }

    async updateStatusBarItems(): Promise<void> {
        if (!this.statusBarItems) {
            return;
        }

        const config = await this.celerManager.readCelerConfig();
        
        // Update platform
        const platform = config.currentPlatform || 'No Platform';
        this.statusBarItems.platform.text = `$(device-desktop) ${platform}`;
        
        // Update project
        const project = config.currentProject || 'No Project';
        this.statusBarItems.project.text = `$(folder) ${project}`;
        
        // Update build type
        const buildType = config.currentBuildType || 'No Build Type';
        this.statusBarItems.buildType.text = `$(tools) ${buildType}`;
    }

    dispose(): void {
        // Clean up status bar items
        if (this.statusBarItems) {
            Object.values(this.statusBarItems).forEach(item => item.dispose());
        }
    }
}
