import * as vscode from 'vscode';
import { Celer } from './celer';

export class DependencyTreeProvider implements vscode.TreeDataProvider<DependencyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DependencyItem | undefined | null | void> = 
        new vscode.EventEmitter<DependencyItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DependencyItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private celerManager: Celer) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DependencyItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DependencyItem): Promise<DependencyItem[]> {
        if (!element) {
            // Root level - show all dependencies
            try {
                const packages = await this.celerManager.list();
                return packages.map((pkg: { name: string; version: string; description?: string }) => new DependencyItem(
                    pkg.name,
                    pkg.version,
                    pkg.description,
                    vscode.TreeItemCollapsibleState.None
                ));
            } catch (error) {
                return [];
            }
        }
        
        return [];
    }
}

export class DependencyItem extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly version: string,
        public readonly description?: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(name, collapsibleState);
        
        this.tooltip = `${name} v${version}${description ? '\n' + description : ''}`;
        this.description = version;
        this.contextValue = 'dependency';
        
        // Set icon
        this.iconPath = new vscode.ThemeIcon('package');
    }
}
