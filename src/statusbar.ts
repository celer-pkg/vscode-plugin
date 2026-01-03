import * as vscode from 'vscode';
import { Celer } from './celer';

interface StatusBarItems {
    configure: vscode.StatusBarItem;
    install: vscode.StatusBarItem;
    update: vscode.StatusBarItem;
    search: vscode.StatusBarItem;
    create: vscode.StatusBarItem;
    platform: vscode.StatusBarItem;
    project: vscode.StatusBarItem;
    buildType: vscode.StatusBarItem;
    jobs: vscode.StatusBarItem;
    separator: vscode.StatusBarItem;
    autoremove: vscode.StatusBarItem;
    init: vscode.StatusBarItem;
    clean: vscode.StatusBarItem;
    reverse: vscode.StatusBarItem;
    tree: vscode.StatusBarItem;
    version: vscode.StatusBarItem;
}

export class StatusBarManager {
    private statusBarItems?: StatusBarItems;

    constructor(
        private celerManager: Celer,
        private context: vscode.ExtensionContext
    ) { }

    createStatusBarItems(): void {
        // Create all status bar items (higher priority number = more left)
        // Use lower priority to not interfere with VS Code built-in items like "No Problems"
        const basePriority = 5;
        this.statusBarItems = {
            version: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 14),
            configure: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 13),
            platform: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 12),
            project: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 11),
            buildType: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 10),
            jobs: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 9),
            separator: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 8),
            init: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 7),
            create: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 6),
            update: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 5),
            search: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 4),
            install: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 3),
            autoremove: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 2),
            clean: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 1),
            reverse: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 0),
            tree: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority - 1)
        };

        // Version (show last to ensure leftmost position)
        this.statusBarItems.version.text = '$(info)';
        this.statusBarItems.version.tooltip = 'Show version info';
        this.statusBarItems.version.command = 'celer.version';
        this.statusBarItems.version.show();

        // Configure button
        this.statusBarItems.configure.text = '$(settings)';
        this.statusBarItems.configure.tooltip = 'Celer: Configure Settings';
        this.statusBarItems.configure.command = 'celer.configure';
        this.statusBarItems.configure.show();

        // Platform selector
        this.statusBarItems.platform.command = 'celer.selectPlatform';
        this.statusBarItems.platform.tooltip = 'Click to switch platform';
        this.statusBarItems.platform.show();

        // Project selector
        this.statusBarItems.project.command = 'celer.selectProject';
        this.statusBarItems.project.tooltip = 'Click to switch project';
        this.statusBarItems.project.show();


        // Build Type selector
        this.statusBarItems.buildType.command = 'celer.selectBuildType';
        this.statusBarItems.buildType.tooltip = 'Click to switch build type';
        this.statusBarItems.buildType.show();

        // Jobs selector
        this.statusBarItems.jobs.command = 'celer.selectJobs';
        this.statusBarItems.jobs.tooltip = 'Click to set parallel build jobs';
        this.statusBarItems.jobs.show();

        // Separator (visual only)
        this.statusBarItems.separator.text = '|';
        this.statusBarItems.separator.tooltip = '';
        this.statusBarItems.separator.show();

        // Init
        this.statusBarItems.init.text = 'Init';
        this.statusBarItems.init.tooltip = 'Initialize with a repository';
        this.statusBarItems.init.command = 'celer.init';
        this.statusBarItems.init.show();

        // Clean
        this.statusBarItems.clean.text = 'Clean';
        this.statusBarItems.clean.tooltip = 'Remove build cache and clean source repository';
        this.statusBarItems.clean.command = 'celer.clean';
        this.statusBarItems.clean.show();

        // Reverse
        this.statusBarItems.reverse.text = 'Reverse';
        this.statusBarItems.reverse.tooltip = 'Query reverse dependencies';
        this.statusBarItems.reverse.command = 'celer.reverse';
        this.statusBarItems.reverse.show();

        // Tree
        this.statusBarItems.tree.text = 'Tree';
        this.statusBarItems.tree.tooltip = 'Show dependency tree';
        this.statusBarItems.tree.command = 'celer.tree';
        this.statusBarItems.tree.show();

        // Create Platform/Project/Port
        this.statusBarItems.create.text = 'Create';
        this.statusBarItems.create.tooltip = 'Create platform, project or port';
        this.statusBarItems.create.command = 'celer.create';
        this.statusBarItems.create.show();

        // Install Dependencies
        this.statusBarItems.install.text = 'Install';
        this.statusBarItems.install.tooltip = 'Install Package';
        this.statusBarItems.install.command = 'celer.install';
        this.statusBarItems.install.show();

        // Update Packages
        this.statusBarItems.update.text = 'Update';
        this.statusBarItems.update.tooltip = 'Update Repositories';
        this.statusBarItems.update.command = 'celer.update';
        this.statusBarItems.update.show();

        // Search Packages
        this.statusBarItems.search.text = 'Search';
        this.statusBarItems.search.tooltip = 'Search Packages';
        this.statusBarItems.search.command = 'celer.search';
        this.statusBarItems.search.show();

        // Auto Remove
        this.statusBarItems.autoremove.text = 'Autoremove';
        this.statusBarItems.autoremove.tooltip = 'Autoremove Unused Packages';
        this.statusBarItems.autoremove.command = 'celer.autoremove';
        this.statusBarItems.autoremove.show();

        // Add to subscriptions
        this.context.subscriptions.push(
            this.statusBarItems.version,
            this.statusBarItems.configure,
            this.statusBarItems.platform,
            this.statusBarItems.project,
            this.statusBarItems.buildType,
            this.statusBarItems.jobs,
            this.statusBarItems.separator,
            this.statusBarItems.init,
            this.statusBarItems.create,
            this.statusBarItems.update,
            this.statusBarItems.search,
            this.statusBarItems.install,
            this.statusBarItems.autoremove,
            this.statusBarItems.clean,
            this.statusBarItems.reverse,
            this.statusBarItems.tree,
        );

        // Update with current values
        this.updateStatusBarItems();
    }

    async updateStatusBarItems(): Promise<void> {
        if (!this.statusBarItems) {
            return;
        }

        try {
            const config = await this.celerManager.readCelerConfig();
            if (!config) {
                return;
            }

            // Update platform
            const platform = config.currentPlatform || 'Select platform';
            this.statusBarItems.platform.text = `$(chip) ${platform}`;

            // Update project
            const project = config.currentProject || 'Select project';
            this.statusBarItems.project.text = `$(folder) ${project}`;

            // Update build type
            const buildType = config.currentBuildType || 'Select build type';
            this.statusBarItems.buildType.text = `$(tools) ${buildType}`;

            // Update jobs
            const jobs = config.jobs || 'N/A';
            this.statusBarItems.jobs.text = `$(rocket) ${jobs}`;
        } catch (error) {
            // Silently handle errors
        }
    }

    dispose(): void {
        // Clean up status bar items
        if (this.statusBarItems) {
            Object.values(this.statusBarItems).forEach(item => item.dispose());
        }
    }
}
