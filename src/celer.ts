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
    jobs?: number;
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

    public async runCommandInTerminal(args: string[]): Promise<void> {
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

    public async runCommand(args: string[], workspaceFolder?: string): Promise<string> {
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

    async hasCelerProject(): Promise<boolean> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return false;
        }

        try {
            const celerToml = await vscode.workspace.findFiles('**/celer.toml', null, 1);
            return celerToml.length > 0;
        } catch {
            return false;
        }
    }

    async getCelerTomlPath(): Promise<string | undefined> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        // Check for celer.toml in workspace root only
        const celerTomlPath = path.join(workspaceFolder.uri.fsPath, 'celer.toml');
        if (fs.existsSync(celerTomlPath)) {
            return celerTomlPath;
        }

        // Check for Celer.toml (capitalized) in workspace root only
        const celerTomlUpperPath = path.join(workspaceFolder.uri.fsPath, 'Celer.toml');
        if (fs.existsSync(celerTomlUpperPath)) {
            return celerTomlUpperPath;
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
            const parsed = toml.parse(content) as any;
            
            // Support both root level and [global] section
            const section = parsed.global || parsed;
            
            const config: CelerConfig = {
                platforms: Array.isArray(section.platforms) ? section.platforms : [],
                projects: Array.isArray(section.projects) ? section.projects : [],
                currentPlatform: section.platform,
                currentProject: section.project,
                currentBuildType: section.build_type,
                jobs: section.jobs ? parseInt(section.jobs) : undefined
            };

            return config;
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to parse celer.toml: ${error}`);
            return {};
        }
    }

    async writeCelerConfig(config: Partial<CelerConfig>): Promise<void> {
        try {
            // Use celer configure command and wait for completion
            if (config.currentPlatform !== undefined) {
                this.outputChannel.appendLine(`[INFO] Setting platform to: ${config.currentPlatform}`);
                await this.runCommand(['configure', '--platform', config.currentPlatform]);
                this.outputChannel.appendLine(`[SUCCESS] Platform set to: ${config.currentPlatform}`);
            }
            
            if (config.currentProject !== undefined) {
                this.outputChannel.appendLine(`[INFO] Setting project to: ${config.currentProject}`);
                await this.runCommand(['configure', '--project', config.currentProject]);
                this.outputChannel.appendLine(`[SUCCESS] Project set to: ${config.currentProject}`);
            }
            
            if (config.currentBuildType !== undefined) {
                this.outputChannel.appendLine(`[INFO] Setting build type to: ${config.currentBuildType}`);
                await this.runCommand(['configure', '--build-type', config.currentBuildType]);
                this.outputChannel.appendLine(`[SUCCESS] Build type set to: ${config.currentBuildType}`);
            }

            // Wait a bit for file system to sync
            await new Promise(resolve => setTimeout(resolve, 300));
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
