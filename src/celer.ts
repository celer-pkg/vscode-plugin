import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { parse as tomlParse } from '@ltd/j-toml';

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

    /**
     * Remove ANSI escape codes from string
     */
    private stripAnsiCodes(text: string): string {
        // eslint-disable-next-line no-control-regex
        return text.replace(/\x1b\[[0-9;]*m/g, '');
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
                    // Strip ANSI codes from error message for dialog display
                    const cleanStderr = this.stripAnsiCodes(stderr);
                    reject(new Error(`Celer command failed with code ${code}:\n${cleanStderr}`));
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
            this.outputChannel.appendLine('[DEBUG] getCelerTomlPath: no workspace folder');
            return undefined;
        }

        const rootPath = workspaceFolder.uri.fsPath;
        this.outputChannel.appendLine(`[DEBUG] getCelerTomlPath: workspace root = ${rootPath}`);

        // Check for celer.toml in workspace root only
        const celerTomlPath = path.join(rootPath, 'celer.toml');
        this.outputChannel.appendLine(`[DEBUG] getCelerTomlPath: checking ${celerTomlPath}, exists=${fs.existsSync(celerTomlPath)}`);
        if (fs.existsSync(celerTomlPath)) {
            return celerTomlPath;
        }

        // Check for Celer.toml (capitalized) in workspace root only
        const celerTomlUpperPath = path.join(rootPath, 'Celer.toml');
        this.outputChannel.appendLine(`[DEBUG] getCelerTomlPath: checking ${celerTomlUpperPath}, exists=${fs.existsSync(celerTomlUpperPath)}`);
        if (fs.existsSync(celerTomlUpperPath)) {
            return celerTomlUpperPath;
        }

        // Fallback: use findFiles (same as hasCelerProject)
        this.outputChannel.appendLine('[DEBUG] getCelerTomlPath: root check failed, trying findFiles');
        const files = await vscode.workspace.findFiles('**/{celer,Celer}.toml', null, 1);
        if (files.length > 0) {
            this.outputChannel.appendLine(`[DEBUG] getCelerTomlPath: found via findFiles = ${files[0].fsPath}`);
            return files[0].fsPath;
        }

        this.outputChannel.appendLine('[DEBUG] getCelerTomlPath: celer.toml not found');
        return undefined;
    }

    async readCelerConfig(): Promise<CelerConfig> {
        const tomlPath = await this.getCelerTomlPath();
        if (!tomlPath) {
            return {};
        }

        try {
            const content = fs.readFileSync(tomlPath, 'utf-8');
            const parsed = tomlParse(content) as any;

            // Log parsed keys for debugging (avoid serializing BigInt values)
            this.outputChannel.appendLine(`[DEBUG] Parsed celer.toml keys: ${JSON.stringify(Object.keys(parsed))}`);

            // Try multiple possible section names (celer may have changed the TOML structure)
            const section = parsed.main || parsed.global || parsed.workspace || parsed.build || parsed.settings || parsed;

            const config: CelerConfig = {
                platforms: Array.isArray(section.platforms) ? section.platforms : [],
                projects: Array.isArray(section.projects) ? section.projects : [],
                currentPlatform: section.platform,
                currentProject: section.project,
                currentBuildType: section.build_type,
                jobs: section.jobs ? parseInt(section.jobs) : undefined
            };

            this.outputChannel.appendLine(`[DEBUG] Read config: platform=${config.currentPlatform}, project=${config.currentProject}, buildType=${config.currentBuildType}, jobs=${config.jobs}`);

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
                await this.runCommand(['configure', `--platform=${config.currentPlatform}`]);
                this.outputChannel.appendLine(`[SUCCESS] Platform set to: ${config.currentPlatform}`);
            }

            if (config.currentProject !== undefined) {
                this.outputChannel.appendLine(`[INFO] Setting project to: ${config.currentProject}`);
                await this.runCommand(['configure', `--project=${config.currentProject}`]);
                this.outputChannel.appendLine(`[SUCCESS] Project set to: ${config.currentProject}`);
            }

            if (config.currentBuildType !== undefined) {
                this.outputChannel.appendLine(`[INFO] Setting build type to: ${config.currentBuildType}`);
                await this.runCommand(['configure', `--build-type=${config.currentBuildType}`]);
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
        return ['Debug', 'Release', 'RelWithDebInfo', 'MinSizeRel'];
    }

    async getConfRepositoryUrl(): Promise<string | undefined> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        const confPath = path.join(workspaceFolder.uri.fsPath, 'conf');
        if (!fs.existsSync(confPath)) {
            return undefined;
        }

        const gitConfigPath = path.join(confPath, '.git', 'config');
        if (!fs.existsSync(gitConfigPath)) {
            return undefined;
        }

        try {
            const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');
            // Parse git config to find remote origin url
            const urlMatch = gitConfig.match(/\[remote "origin"\][^\[]*url\s*=\s*(.+)/);
            if (urlMatch && urlMatch[1]) {
                return urlMatch[1].trim();
            }
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to read git config: ${error}`);
        }

        return undefined;
    }

    async getConfRepositoryBranch(): Promise<string | undefined> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        const confPath = path.join(workspaceFolder.uri.fsPath, 'conf');
        if (!fs.existsSync(confPath)) {
            return undefined;
        }

        const gitHeadPath = path.join(confPath, '.git', 'HEAD');
        if (!fs.existsSync(gitHeadPath)) {
            return undefined;
        }

        try {
            const headContent = fs.readFileSync(gitHeadPath, 'utf-8').trim();
            // HEAD content format: "ref: refs/heads/branch-name" or direct commit hash
            const branchMatch = headContent.match(/ref:\s*refs\/heads\/(.+)/);
            if (branchMatch && branchMatch[1]) {
                return branchMatch[1].trim();
            }
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to read git HEAD: ${error}`);
        }

        return undefined;
    }

    async hasConfRepositoryChanges(): Promise<boolean> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return false;
        }

        const confPath = path.join(workspaceFolder.uri.fsPath, 'conf');
        if (!fs.existsSync(confPath)) {
            return false;
        }

        const gitPath = path.join(confPath, '.git');
        if (!fs.existsSync(gitPath)) {
            return false;
        }

        return new Promise((resolve) => {
            try {
                const process = cp.spawn('git', ['status', '--porcelain'], {
                    cwd: confPath,
                    shell: true
                });

                let output = '';
                process.stdout?.on('data', (data) => {
                    output += data.toString();
                });

                process.on('close', (code) => {
                    if (code === 0) {
                        // If output is not empty, there are changes
                        resolve(output.trim().length > 0);
                    } else {
                        resolve(false);
                    }
                });

                process.on('error', () => {
                    resolve(false);
                });
            } catch (error) {
                this.outputChannel.appendLine(`[ERROR] Failed to check git status: ${error}`);
                resolve(false);
            }
        });
    }

    async getInstalledPackages(): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        const buildtreesPath = path.join(workspaceFolder.uri.fsPath, 'buildtrees');
        if (!fs.existsSync(buildtreesPath)) {
            this.outputChannel.appendLine(`[INFO] buildtrees directory not found: ${buildtreesPath}`);
            return [];
        }

        try {
            const dirs = fs.readdirSync(buildtreesPath, { withFileTypes: true });
            const packages = dirs
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name)
                .sort();
            
            this.outputChannel.appendLine(`[INFO] Found ${packages.length} installed packages in buildtrees`);
            return packages;
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to read buildtrees: ${error}`);
            return [];
        }
    }

    async getAvailablePorts(): Promise<string[]> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            this.outputChannel.appendLine(`[ERROR] No workspace folder found`);
            return [];
        }

        const portsPath = path.join(workspaceFolder.uri.fsPath, 'ports');
        this.outputChannel.appendLine(`[INFO] Looking for ports in: ${portsPath}`);
        
        if (!fs.existsSync(portsPath)) {
            this.outputChannel.appendLine(`[WARN] ports directory not found: ${portsPath}`);
            return [];
        }

        try {
            const ports: string[] = [];
            const topLevelDirs = fs.readdirSync(portsPath, { withFileTypes: true });
            this.outputChannel.appendLine(`[INFO] Found ${topLevelDirs.length} items in ports directory`);

            for (const topDir of topLevelDirs) {
                // Skip .git and other hidden directories
                if (topDir.name.startsWith('.')) {
                    continue;
                }
                
                if (topDir.isDirectory()) {
                    const topDirPath = path.join(portsPath, topDir.name);
                    
                    // Check if this is a category directory (a, b, c, etc.)
                    const subItems = fs.readdirSync(topDirPath, { withFileTypes: true });
                    
                    for (const item of subItems) {
                        if (item.isDirectory()) {
                            const portName = item.name;
                            const portPath = path.join(topDirPath, portName);
                            
                            // Check for version subdirectories
                            const versionDirs = fs.readdirSync(portPath, { withFileTypes: true });
                            for (const versionDir of versionDirs) {
                                if (versionDir.isDirectory()) {
                                    const version = versionDir.name;
                                    const portFullName = `${portName}@${version}`;
                                    ports.push(portFullName);
                                }
                            }
                        }
                    }
                }
            }

            ports.sort();
            this.outputChannel.appendLine(`[INFO] Total available ports: ${ports.length}`);
            return ports;
        } catch (error) {
            this.outputChannel.appendLine(`[ERROR] Failed to read ports directory: ${error}`);
            return [];
        }
    }

    async getPortVersion(portName: string): Promise<string | undefined> {
        // This method is no longer needed since versions are in directory names
        // Kept for compatibility, returns undefined
        return undefined;
    }
}
