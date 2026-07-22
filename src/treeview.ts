import * as vscode from 'vscode';
import * as os from 'os';
import { Celer } from './celer';

type CelerTreeItem = ConfigItem | CommandItem | SectionItem | OptionItem;

// ── Section (collapsible group header) ──
class SectionItem extends vscode.TreeItem {
    constructor(label: string, public readonly children: CelerTreeItem[]) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'section';
    }
}

// ── Config selector (expand to see options inline) ──
class ConfigItem extends vscode.TreeItem {
    constructor(
        label: string,
        tooltip: string,
        public readonly configKey: string,
        iconId: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.tooltip = tooltip;
        this.iconPath = new vscode.ThemeIcon(iconId);
        this.contextValue = 'config';
    }
}

// ── Option leaf (one selectable value) ──
class OptionItem extends vscode.TreeItem {
    constructor(
        label: string,
        isCurrent: boolean,
        commandId: string,
        args: any[]
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = isCurrent ? new vscode.ThemeIcon('check') : undefined;
        this.description = isCurrent ? 'current' : undefined;
        this.command = { command: commandId, title: label, arguments: args };
        this.contextValue = 'option';
    }
}

// ── Command (action button) ──
class CommandItem extends vscode.TreeItem {
    constructor(
        label: string,
        tooltip: string,
        iconId: string,
        commandId: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = tooltip;
        this.iconPath = new vscode.ThemeIcon(iconId);
        this.command = { command: commandId, title: label };
        this.contextValue = 'command';
    }
}

export class CelerTreeDataProvider implements vscode.TreeDataProvider<CelerTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<CelerTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private celerManager: Celer) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CelerTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CelerTreeItem): Promise<CelerTreeItem[]> {
        // ── Expand a ConfigItem → show available options ──
        if (element instanceof ConfigItem) {
            return this.getConfigOptions(element.configKey);
        }

        // ── Expand a SectionItem → show its children ──
        if (element instanceof SectionItem) {
            return element.children;
        }

        // ── Root → build sections ──
        const config = await this.celerManager.readCelerConfig().catch(() => undefined);
        const platform = config?.currentPlatform || 'Not set';
        const project = config?.currentProject || 'Not set';
        const buildType = config?.currentBuildType || 'Not set';
        const jobs = config?.jobs;
        const cpuCount = os.cpus().length;
        const padWidth = String(cpuCount).length;
        const jobsLabel = jobs ? `${String(jobs).padStart(padWidth, '0')} / ${cpuCount} cores` : 'Not set';

        const configSection = new SectionItem('Configuration', [
            new ConfigItem(`Platform: ${platform}`, 'Select target platform', 'platform', 'chip'),
            new ConfigItem(`Project: ${project}`, 'Select active project', 'project', 'folder'),
            new ConfigItem(`Build Type: ${buildType}`, 'Select build type', 'buildType', 'tools'),
            new ConfigItem(`Jobs: ${jobsLabel}`, 'Set parallel build jobs', 'jobs', 'rocket'),
        ]);

        const commandsSection = new SectionItem('Commands', [
            new CommandItem('Init', 'Initialize with a repository', 'repo-create', 'celer.init'),
            new CommandItem('Install', 'Install Package', 'cloud-download', 'celer.install'),
            new CommandItem('Remove', 'Remove Package', 'trash', 'celer.remove'),
            new CommandItem('Update', 'Update Repositories', 'sync', 'celer.update'),
            new CommandItem('Search', 'Search Packages', 'search', 'celer.search'),
            new CommandItem('Create', 'Create platform, project or port', 'new-file', 'celer.create'),
            new CommandItem('Clean', 'Remove build cache and clean source', 'clear-all', 'celer.clean'),
            new CommandItem('Autoremove', 'Autoremove Unused Packages', 'trash', 'celer.autoremove'),
            new CommandItem('Tree', 'Show dependency tree', 'list-tree', 'celer.tree'),
            new CommandItem('Reverse', 'Query reverse dependencies', 'references', 'celer.reverse'),
            new CommandItem('Deploy', 'Deploy Project', 'rocket', 'celer.deploy'),
            new CommandItem('Version', 'Show version info', 'info', 'celer.version'),
        ]);

        const settingsSection = new SectionItem('Settings', [
            new CommandItem('Configure', 'Configure Celer Settings', 'settings-gear', 'celer.configure'),
        ]);

        return [configSection, commandsSection, settingsSection];
    }

    /** Fetch available options for a config key and return OptionItems */
    private async getConfigOptions(configKey: string): Promise<OptionItem[]> {
        const config = await this.celerManager.readCelerConfig().catch(() => undefined);

        switch (configKey) {
            case 'platform': {
                const platforms = await this.celerManager.getAvailablePlatforms();
                const current = config?.currentPlatform;
                return platforms.map(p => new OptionItem(
                    p, p === current, 'celer.selectPlatform', [{ platform: p }]
                ));
            }
            case 'project': {
                const projects = await this.celerManager.getAvailableProjects();
                const current = config?.currentProject;
                return projects.map(p => new OptionItem(
                    p, p === current, 'celer.selectProject', [{ project: p }]
                ));
            }
            case 'buildType': {
                const types = await this.celerManager.getAvailableBuildTypes();
                const current = config?.currentBuildType?.toLowerCase();
                return types.map(t => new OptionItem(
                    t, t.toLowerCase() === current, 'celer.selectBuildType', [{ buildType: t }]
                ));
            }
            case 'jobs': {
                const cpuCount = os.cpus().length;
                const current = config?.jobs;
                const padWidth = String(cpuCount).length;
                return Array.from({ length: cpuCount }, (_, i) => i + 1).map(jobNum => {
                    let desc = '';
                    if (jobNum === cpuCount) { desc = 'Max (all cores)'; }
                    else if (jobNum === Math.ceil(cpuCount * 0.75)) { desc = 'Recommended (75%)'; }
                    else if (jobNum === Math.ceil(cpuCount / 2)) { desc = 'Balanced (50%)'; }
                    const label = `${String(jobNum).padStart(padWidth, '0')}${desc ? ' — ' + desc : ''}`;
                    return new OptionItem(
                        label, jobNum === current, 'celer.selectJobs', [{ jobs: jobNum }]
                    );
                });
            }
            default:
                return [];
        }
    }
}
