import * as vscode from 'vscode';
import { Celer, Package } from './celer';

// Parse list output
function parseListOutput(output: string): Package[] {
    const packages: Package[] = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        // Try to parse lines like "package-name version - description"
        const match = line.match(/^([\w-]+)\s+([\d.]+)(?:\s+-\s+(.+))?$/);
        if (match) {
            packages.push({
                name: match[1],
                version: match[2],
                description: match[3]
            });
        }
    }
    
    return packages;
}

export class CelerTreeProvider implements vscode.TreeDataProvider<DependencyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DependencyItem | undefined | null | void> = 
        new vscode.EventEmitter<DependencyItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DependencyItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(private celer: Celer) {}

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
                let packages: Package[] = [];
                
                // Try JSON format first
                try {
                    const output = await this.celer.runCommand(['list', '--format', 'json']);
                    packages = JSON.parse(output);
                } catch (error) {
                    // Fallback to plain text parsing
                    const output = await this.celer.runCommand(['list']);
                    packages = parseListOutput(output);
                }
                
                return packages.map((pkg: Package) => new DependencyItem(
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
