import * as vscode from 'vscode';
import * as os from 'os';
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

    // All toggleable items: [configKey, label, itemGetter]
    private itemDefs: Array<{ key: string; label: string; get: () => vscode.StatusBarItem | undefined }> = [];

    constructor(
        private celerManager: Celer,
        private context: vscode.ExtensionContext
    ) { }

    private isEnabled(key: string): boolean {
        return vscode.workspace.getConfiguration('celer.statusBar').get<boolean>(key, true);
    }

    private showIfEnabled(key: string, item: vscode.StatusBarItem): void {
        if (this.isEnabled(key)) { item.show(); } else { item.hide(); }
    }

    private refreshAllVisibility(): void {
        let anyVisible = false;
        for (const def of this.itemDefs) {
            const item = def.get();
            if (item) {
                const enabled = this.isEnabled(def.key);
                if (enabled) { anyVisible = true; item.show(); } else { item.hide(); }
            }
        }
        // Hide separator when all dynamic buttons are hidden
        if (this.statusBarItems?.separator) {
            if (anyVisible) { this.statusBarItems.separator.show(); }
            else { this.statusBarItems.separator.hide(); }
        }
    }

    /** Show the multi-select QuickPick to toggle status bar button visibility */
    async showStatusBarMenu(): Promise<void> {
        const config = vscode.workspace.getConfiguration('celer.statusBar');

        const items = this.itemDefs.map(def => ({
            label: def.label,
            picked: this.isEnabled(def.key),
            key: def.key,
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Check buttons to show on status bar',
            title: 'Celer Status Bar',
            canPickMany: true,
        });

        if (!selected) { return; }

        const selectedKeys = new Set(selected.map(s => s.key));
        for (const def of this.itemDefs) {
            await config.update(def.key, selectedKeys.has(def.key), vscode.ConfigurationTarget.Global);
        }
        this.refreshAllVisibility();
    }

    createStatusBarItems(): void {
        const basePriority = 5;
        this.statusBarItems = {
            version:    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 13),
            configure:  vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 14),
            platform:   vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 12),
            project:    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 11),
            buildType:  vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 10),
            jobs:       vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 9),
            separator:  vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 8),
            init:       vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 7),
            create:     vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 6),
            update:     vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 5),
            search:     vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 4),
            install:    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 3),
            autoremove: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 2),
            clean:      vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 1),
            reverse:    vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority + 0),
            tree:       vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, basePriority - 1)
        };

        // Register toggleable items (only these appear in the menu; core selectors always shown)
        this.itemDefs = [
            { key: 'showInit',       label: 'Init',               get: () => this.statusBarItems?.init },
            { key: 'showCreate',     label: 'Create',             get: () => this.statusBarItems?.create },
            { key: 'showInstall',    label: 'Install',            get: () => this.statusBarItems?.install },
            { key: 'showUpdate',     label: 'Update',             get: () => this.statusBarItems?.update },
            { key: 'showSearch',     label: 'Search',             get: () => this.statusBarItems?.search },
            { key: 'showClean',      label: 'Clean',              get: () => this.statusBarItems?.clean },
            { key: 'showAutoremove', label: 'Autoremove',         get: () => this.statusBarItems?.autoremove },
            { key: 'showReverse',    label: 'Reverse',            get: () => this.statusBarItems?.reverse },
            { key: 'showTree',       label: 'Tree',               get: () => this.statusBarItems?.tree },
        ];

        // --- setup text, tooltip, command for each item ---
        this.statusBarItems.version.text = '$(info)';
        this.statusBarItems.version.tooltip = 'Show version info';
        this.statusBarItems.version.command = 'celer.version';
        this.statusBarItems.version.show();

        // Menu button (opens visibility picker)
        this.statusBarItems.configure.text = '$(menu)';
        this.statusBarItems.configure.tooltip = 'Toggle visible buttons';
        this.statusBarItems.configure.command = 'celer.toggleStatusBar';
        this.statusBarItems.configure.show();

        this.statusBarItems.platform.text = '$(chip) Loading...';
        this.statusBarItems.platform.command = 'celer.selectPlatform';
        this.statusBarItems.platform.tooltip = 'Click to switch platform';
        this.statusBarItems.platform.show();

        this.statusBarItems.project.text = '$(folder) Loading...';
        this.statusBarItems.project.command = 'celer.selectProject';
        this.statusBarItems.project.tooltip = 'Click to switch project';
        this.statusBarItems.project.show();

        this.statusBarItems.buildType.text = '$(tools) Loading...';
        this.statusBarItems.buildType.command = 'celer.selectBuildType';
        this.statusBarItems.buildType.tooltip = 'Click to switch build type';
        this.statusBarItems.buildType.show();

        this.statusBarItems.jobs.text = '$(rocket) Loading...';
        this.statusBarItems.jobs.command = 'celer.selectJobs';
        this.statusBarItems.jobs.tooltip = 'Click to set parallel build jobs';
        this.statusBarItems.jobs.show();

        this.statusBarItems.separator.text = '|';
        this.statusBarItems.separator.tooltip = '';

        this.statusBarItems.init.text = 'Init';
        this.statusBarItems.init.tooltip = 'Initialize with a repository';
        this.statusBarItems.init.command = 'celer.init';

        this.statusBarItems.clean.text = 'Clean';
        this.statusBarItems.clean.tooltip = 'Remove build cache and clean source repository';
        this.statusBarItems.clean.command = 'celer.clean';

        this.statusBarItems.reverse.text = 'Reverse';
        this.statusBarItems.reverse.tooltip = 'Query reverse dependencies';
        this.statusBarItems.reverse.command = 'celer.reverse';

        this.statusBarItems.tree.text = 'Tree';
        this.statusBarItems.tree.tooltip = 'Show dependency tree';
        this.statusBarItems.tree.command = 'celer.tree';

        this.statusBarItems.create.text = 'Create';
        this.statusBarItems.create.tooltip = 'Create platform, project or port';
        this.statusBarItems.create.command = 'celer.create';

        this.statusBarItems.install.text = 'Install';
        this.statusBarItems.install.tooltip = 'Install Package';
        this.statusBarItems.install.command = 'celer.install';

        this.statusBarItems.update.text = 'Update';
        this.statusBarItems.update.tooltip = 'Update Repositories';
        this.statusBarItems.update.command = 'celer.update';

        this.statusBarItems.search.text = 'Search';
        this.statusBarItems.search.tooltip = 'Search Packages';
        this.statusBarItems.search.command = 'celer.search';

        this.statusBarItems.autoremove.text = 'Autoremove';
        this.statusBarItems.autoremove.tooltip = 'Autoremove Unused Packages';
        this.statusBarItems.autoremove.command = 'celer.autoremove';

        // Apply visibility per user settings
        this.refreshAllVisibility();

        // Listen for settings changes so toggles take effect immediately
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('celer.statusBar')) {
                    this.refreshAllVisibility();
                }
            })
        );

        // Add all items to subscriptions
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
    }

    async updateStatusBarItems(): Promise<void> {
        if (!this.statusBarItems) { return; }

        try {
            const config = await this.celerManager.readCelerConfig();
            if (!config) { return; }

            const platform = config.currentPlatform || 'Select platform';
            this.statusBarItems.platform.text = `$(chip) ${platform}`;

            const project = config.currentProject || 'Select project';
            this.statusBarItems.project.text = `$(folder) ${project}`;

            const buildType = config.currentBuildType || 'Select build type';
            const availableTypes = await this.celerManager.getAvailableBuildTypes();
            const matchedType = availableTypes.find(t => t.toLowerCase() === buildType.toLowerCase());
            const displayType = matchedType || buildType;
            this.statusBarItems.buildType.text = `$(tools) ${displayType}`;

            const jobs = config.jobs;
            if (jobs) {
                const cpuCount = os.cpus().length;
                const padWidth = String(cpuCount).length;
                this.statusBarItems.jobs.text = `$(rocket) ${String(jobs).padStart(padWidth, '0')}`;
            } else {
                this.statusBarItems.jobs.text = `$(rocket) N/A`;
            }
        } catch (error) {
            // silently ignore
        }
    }

    dispose(): void {
        if (this.statusBarItems) {
            Object.values(this.statusBarItems).forEach(item => item.dispose());
        }
    }
}
