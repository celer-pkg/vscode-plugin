import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

/**
 * Handles Celer executable installation and integration
 */
export class CelerInstaller {
    constructor(private outputChannel: vscode.OutputChannel) {}

    async ensureCelerInstalled(autoInstall: boolean = false): Promise<boolean> {
        // Check if celer is already available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            return false;
        }

        // Check if local celer.exe exists
        const localCelerPath = path.join(workspaceFolder, process.platform === 'win32' ? 'celer.exe' : 'celer');
        if (fs.existsSync(localCelerPath)) {
            this.outputChannel.appendLine('[INFO] Celer executable found locally');
            return true;
        }

        // Try to check if celer is in system PATH
        try {
            const checkCmd = process.platform === 'win32' ? 'where celer' : 'which celer';
            cp.execSync(checkCmd, { stdio: 'ignore' });
            this.outputChannel.appendLine('[INFO] Celer found in system PATH');
            return true;
        } catch {
            // Celer not in PATH, continue to download
        }

        // If not auto install, ask user
        if (!autoInstall) {
            const choice = await vscode.window.showInformationMessage(
                'Celer executable not found. Would you like to download the latest version from GitHub?',
                'Download', 'Cancel'
            );

            if (choice !== 'Download') {
                return false;
            }
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Downloading Celer',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Fetching latest release info...' });
                
                // Get latest release info
                const releaseInfo = await this.getLatestReleaseInfo();
                
                progress.report({ message: 'Downloading executable...' });
                
                // Download the appropriate binary
                await this.downloadCeler(releaseInfo, workspaceFolder);
                
                progress.report({ message: 'Making executable...' });
                
                // Make executable on Unix-like systems
                if (process.platform !== 'win32') {
                    fs.chmodSync(localCelerPath, 0o755);
                }
            });

            // Run celer integrate
            await this.runCelerIntegrate();

            vscode.window.showInformationMessage('Celer installed and integrated successfully!');
            return true;
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to install Celer: ${errorMsg}`);
            this.outputChannel.appendLine(`[ERROR] Failed to install Celer: ${errorMsg}`);
            return false;
        }
    }

    private async getLatestReleaseInfo(): Promise<any> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: '/repos/celer-pkg/celer/releases/latest',
                method: 'GET',
                headers: {
                    'User-Agent': 'VSCode-Celer-Extension'
                }
            };

            https.get(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const release = JSON.parse(data);
                            resolve(release);
                        } catch (error) {
                            reject(new Error('Failed to parse release info'));
                        }
                    } else {
                        reject(new Error(`GitHub API returned status ${res.statusCode}`));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    private async downloadCeler(releaseInfo: any, targetDir: string): Promise<void> {
        const platform = process.platform;

        let assetPattern: RegExp;
        let extractCmd: string | null = null;
        let outputExe: string;

        if (platform === 'win32') {
            assetPattern = /celer-windows-amd64\.exe\.zip/i;
            outputExe = path.join(targetDir, 'celer.exe');
            extractCmd = `powershell -Command "Expand-Archive -Path '{archive}' -DestinationPath '${targetDir}' -Force"`;
        } else if (platform === 'linux') {
            assetPattern = /celer-amd64-linux\.tar\.gz/i;
            outputExe = path.join(targetDir, 'celer');
            extractCmd = `tar -xzf "{archive}" -C "${targetDir}"`;
        } else if (platform === 'darwin') {
            assetPattern = /celer.*darwin|celer.*macos/i;
            outputExe = path.join(targetDir, 'celer');
        } else {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        const asset = releaseInfo.assets?.find((a: any) => assetPattern.test(a.name));
        if (!asset) {
            const names = (releaseInfo.assets || []).map((a: any) => a.name).join(', ');
            throw new Error(`No asset matching ${assetPattern} found. Available: ${names}`);
        }

        const archivePath = path.join(targetDir, asset.name);
        this.outputChannel.appendLine(`[INFO] Downloading ${asset.name} from ${asset.browser_download_url}`);

        await this.downloadFile(asset.browser_download_url, archivePath);

        if (extractCmd) {
            this.outputChannel.appendLine(`[INFO] Extracting ${asset.name}...`);
            const cmd = extractCmd.replace('{archive}', archivePath);
            cp.execSync(cmd, { cwd: targetDir, stdio: 'pipe' });
            try { fs.unlinkSync(archivePath); } catch {}
        } else {
            fs.renameSync(archivePath, outputExe);
        }

        if (platform !== 'win32') {
            fs.chmodSync(outputExe, 0o755);
        }
    }

    private async downloadFile(url: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(targetPath);
            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    if (redirectUrl) {
                        https.get(redirectUrl, (rr) => {
                            rr.pipe(file);
                            file.on('finish', () => { file.close(); resolve(); });
                        }).on('error', reject);
                    } else { reject(new Error('Redirect location not found')); }
                } else {
                    response.pipe(file);
                    file.on('finish', () => { file.close(); resolve(); });
                }
            }).on('error', reject);
            file.on('error', reject);
        });
    }

    private async runCelerIntegrate(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        // Create or get terminal
        const terminalName = 'Celer';
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);
        
        if (!terminal) {
            terminal = vscode.window.createTerminal({
                name: terminalName,
                cwd: workspaceFolder
            });
        }

        // Show the terminal
        terminal.show(true);

        // Run integrate command
        const integrateCmd = process.platform === 'win32' ? '.\\celer.exe integrate' : './celer integrate';
        terminal.sendText(integrateCmd);

        this.outputChannel.appendLine(`[INFO] Running: ${integrateCmd}`);
        
        // Wait for command to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}
