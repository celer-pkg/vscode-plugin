import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as toml from '@iarna/toml';

export interface Package {
    name: string;
    version: string;
    description?: string;
}

export interface CelerConfig {
    platforms?: string[];
    projects?: string[];
    currentPlatform?: string;
    currentProject?: string;
    currentBuildType?: string;
}

export class Celer {
    private outputChannel: vscode.OutputChannel;
    private celerPath: string;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Celer');
        this.celerPath = this.getCelerExecutable();
    }

    private getCelerExecutable(): string {
        const config = vscode.workspace.getConfiguration('celer');
        let executable = config.get<string>('executable', 'celer');
        
        // On Windows, check if celer.exe exists in workspace root
        if (process.platform === 'win32' && executable === 'celer') {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceFolder) {
                const localCeler = path.join(workspaceFolder, 'celer.exe');
                if (fs.existsSync(localCeler)) {
                    this.outputChannel.appendLine(`[INFO] Using local celer.exe: ${localCeler}`);
                    return localCeler;
                }
            }
            // Add .exe extension if not present
            executable = 'celer.exe';
        }
        
        return executable;
    }

    public showOutput() {
        this.outputChannel.show();
    }

    public getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }

    private async runCommandInTerminal(args: string[]): Promise<void> {
        const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!cwd) {
            throw new Error('No workspace folder found');
        }

        // Create or reuse terminal
        const terminalName = 'Celer';
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);
        
        if (!terminal) {
            terminal = vscode.window.createTerminal({
                name: terminalName,
                cwd: cwd
            });
        }

        // Show the terminal
        terminal.show(true);

        // Build the command - use relative path if it's a local executable
        let cmdExecutable = this.celerPath;
        if (path.isAbsolute(cmdExecutable)) {
            // If it's an absolute path in the workspace, use relative path
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceFolder && cmdExecutable.startsWith(workspaceFolder)) {
                cmdExecutable = './' + path.relative(workspaceFolder, cmdExecutable);
            }
        }
        
        const command = `${cmdExecutable} ${args.join(' ')}`;
        
        // Log to output channel as well
        this.outputChannel.appendLine(`Running in terminal: ${command}`);
        
        // Send command to terminal
        terminal.sendText(command);

        // Wait for command to execute
        // Configure commands need time to write the file
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    private async runCommand(args: string[], workspaceFolder?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const cwd = workspaceFolder || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            
            if (!cwd) {
                reject(new Error('No workspace folder found'));
                return;
            }

            this.outputChannel.appendLine(`Running: ${this.celerPath} ${args.join(' ')}`);
            
            const process = cp.spawn(this.celerPath, args, { 
                cwd,
                shell: true 
            });

            let stdout = '';
            let stderr = '';

            process.stdout?.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                this.outputChannel.append(output);
            });

            process.stderr?.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                this.outputChannel.append(output);
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Celer command failed with code ${code}:\n${stderr}`));
                }
            });

            process.on('error', (err) => {
                reject(err);
            });
        });
    }

    async install(): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Installing Celer dependencies...',
                cancellable: false
            }, async () => {
                await this.runCommand(['install']);
                vscode.window.showInformationMessage('Celer dependencies installed successfully');
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install dependencies: ${error}`);
            throw error;
        }
    }

    async add(packageName: string): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Adding package ${packageName}...`,
                cancellable: false
            }, async () => {
                await this.runCommand(['add', packageName]);
                vscode.window.showInformationMessage(`Package ${packageName} added successfully`);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add package: ${error}`);
            throw error;
        }
    }

    async remove(packageName: string): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Removing package ${packageName}...`,
                cancellable: false
            }, async () => {
                await this.runCommand(['remove', packageName]);
                vscode.window.showInformationMessage(`Package ${packageName} removed successfully`);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove package: ${error}`);
            throw error;
        }
    }

    async update(packageName?: string): Promise<void> {
        try {
            const args = packageName ? ['update', packageName] : ['update'];
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: packageName ? `Updating ${packageName}...` : 'Updating all packages...',
                cancellable: false
            }, async () => {
                await this.runCommand(args);
                vscode.window.showInformationMessage(
                    packageName ? `Package ${packageName} updated` : 'All packages updated'
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update: ${error}`);
            throw error;
        }
    }

    async search(query: string): Promise<Package[]> {
        try {
            const output = await this.runCommand(['search', query, '--format', 'json']);
            return JSON.parse(output);
        } catch (error) {
            try {
                const output = await this.runCommand(['search', query]);
                return this.parseSearchOutput(output);
            } catch (fallbackError) {
                vscode.window.showErrorMessage(`Failed to search packages: ${fallbackError}`);
                return [];
            }
        }
    }

    async list(): Promise<Package[]> {
        try {
            const output = await this.runCommand(['list', '--format', 'json']);
            return JSON.parse(output);
        } catch (error) {
            try {
                const output = await this.runCommand(['list']);
                return this.parseListOutput(output);
            } catch (fallbackError) {
                this.outputChannel.appendLine(`Failed to list packages: ${fallbackError}`);
                return [];
            }
        }
    }

    private parseSearchOutput(output: string): Package[] {
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

    private parseListOutput(output: string): Package[] {
        const packages: Package[] = [];
        const lines = output.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            // Try to parse lines like "package-name@version" or "package-name version"
            const match = line.match(/^([\w-]+)[@\s]+([\d.]+)(?:\s+(.+))?$/);
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

    async hasCelerProject(): Promise<boolean> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return false;
        }

        try {
            const celerToml = await vscode.workspace.findFiles('**/celer.toml', null, 1);
            const celerTomlUpper = await vscode.workspace.findFiles('**/Celer.toml', null, 1);
            return celerToml.length > 0 || celerTomlUpper.length > 0;
        } catch {
            return false;
        }
    }

    async getCelerTomlPath(): Promise<string | undefined> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        const celerToml = await vscode.workspace.findFiles('**/celer.toml', null, 1);
        if (celerToml.length > 0) {
            return celerToml[0].fsPath;
        }

        const celerTomlUpper = await vscode.workspace.findFiles('**/Celer.toml', null, 1);
        if (celerTomlUpper.length > 0) {
            return celerTomlUpper[0].fsPath;
        }

        return undefined;
    }

    async readCelerConfig(): Promise<CelerConfig> {
        const tomlPath = await this.getCelerTomlPath();
        if (!tomlPath) {
            return {};
        }

        try {
            const content = fs.readFileSync(tomlPath, 'utf-8');
            this.outputChannel.appendLine(`[DEBUG] TOML file path: ${tomlPath}`);
            this.outputChannel.appendLine(`[DEBUG] TOML content:\n${content}`);
            
            const parsed = toml.parse(content) as any;
            
            this.outputChannel.appendLine(`[DEBUG] Parsed keys: ${Object.keys(parsed).join(', ')}`);
            
            // Support both root level and [global] section
            const section = parsed.global || parsed;
            
            this.outputChannel.appendLine(`[DEBUG] Using section with keys: ${Object.keys(section).join(', ')}`);
            this.outputChannel.appendLine(`[DEBUG] section.platform = ${section.platform}`);
            this.outputChannel.appendLine(`[DEBUG] section.project = ${section.project}`);
            
            const config: CelerConfig = {
                platforms: Array.isArray(section.platforms) ? section.platforms : [],
                projects: Array.isArray(section.projects) ? section.projects : [],
                currentPlatform: section.platform,
                currentProject: section.project,
                currentBuildType: section.build_type
            };

            this.outputChannel.appendLine(`[DEBUG] Final config: platform=${config.currentPlatform}, project=${config.currentProject}, build_type=${config.currentBuildType}`);
            return config;
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to parse celer.toml: ${error}`);
            console.error('Failed to parse celer.toml:', error);
            return {};
        }
    }

    async writeCelerConfig(config: Partial<CelerConfig>): Promise<void> {
        try {
            // Use celer configure command to update settings in terminal
            if (config.currentPlatform !== undefined) {
                await this.runCommandInTerminal(['configure', '--platform', config.currentPlatform]);
                this.outputChannel.appendLine(`[SUCCESS] Platform set to: ${config.currentPlatform}`);
            }
            
            if (config.currentProject !== undefined) {
                await this.runCommandInTerminal(['configure', '--project', config.currentProject]);
                this.outputChannel.appendLine(`[SUCCESS] Project set to: ${config.currentProject}`);
            }
            
            if (config.currentBuildType !== undefined) {
                await this.runCommandInTerminal(['configure', '--build-type', config.currentBuildType]);
                this.outputChannel.appendLine(`[SUCCESS] Build type set to: ${config.currentBuildType}`);
            }
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to configure: ${error}`);
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to configure Celer: ${errorMessage}`);
            throw error;
        }
    }

    async getAvailablePlatforms(): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const confPlatformsPath = path.join(workspaceFolder.uri.fsPath, 'conf', 'platforms');
        if (!fs.existsSync(confPlatformsPath)) {
            this.outputChannel.appendLine(`[INFO] conf/platforms directory not found: ${confPlatformsPath}`);
            return [];
        }

        try {
            const files = fs.readdirSync(confPlatformsPath);
            const tomlFiles = files
                .filter(file => file.endsWith('.toml'))
                .map(file => file.replace('.toml', ''));
            
            this.outputChannel.appendLine(`[INFO] Found ${tomlFiles.length} platforms: ${tomlFiles.join(', ')}`);
            return tomlFiles;
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to read platforms: ${error}`);
            return [];
        }
    }

    async getAvailableProjects(): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const confProjectsPath = path.join(workspaceFolder.uri.fsPath, 'conf', 'projects');
        if (!fs.existsSync(confProjectsPath)) {
            this.outputChannel.appendLine(`[INFO] conf/projects directory not found: ${confProjectsPath}`);
            return [];
        }

        try {
            const files = fs.readdirSync(confProjectsPath);
            const tomlFiles = files
                .filter(file => file.endsWith('.toml'))
                .map(file => file.replace('.toml', ''));
            
            this.outputChannel.appendLine(`[INFO] Found ${tomlFiles.length} projects: ${tomlFiles.join(', ')}`);
            return tomlFiles;
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to read projects: ${error}`);
            return [];
        }
    }

    async getAvailableBuildTypes(): Promise<string[]> {
        // Build types are typically: debug, release, relwithdebinfo, minsizerel
        return ['debug', 'release', 'relwithdebinfo', 'minsizerel'];
    }
}
