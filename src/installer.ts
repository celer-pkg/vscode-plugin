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
                await this.downloadCeler(releaseInfo, localCelerPath);
                
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

    private async downloadCeler(releaseInfo: any, targetPath: string): Promise<void> {
        // Determine the correct asset name based on platform
        const platform = process.platform;
        
        let assetName: string;
        if (platform === 'win32') {
            assetName = 'celer.exe';
        } else if (platform === 'darwin') {
            assetName = 'celer-macos';
        } else if (platform === 'linux') {
            assetName = 'celer-linux';
        } else {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        // Find the asset in the release
        const asset = releaseInfo.assets?.find((a: any) => a.name === assetName);
        if (!asset) {
            throw new Error(`No asset found for ${assetName} in latest release`);
        }

        this.outputChannel.appendLine(`[INFO] Downloading from: ${asset.browser_download_url}`);

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(targetPath);
            
            https.get(asset.browser_download_url, (response) => {
                // Handle redirects
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    if (redirectUrl) {
                        https.get(redirectUrl, (redirectResponse) => {
                            redirectResponse.pipe(file);
                            file.on('finish', () => {
                                file.close();
                                resolve();
                            });
                        }).on('error', (error) => {
                            fs.unlinkSync(targetPath);
                            reject(error);
                        });
                    } else {
                        reject(new Error('Redirect location not found'));
                    }
                } else {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve();
                    });
                }
            }).on('error', (error) => {
                fs.unlinkSync(targetPath);
                reject(error);
            });

            file.on('error', (error) => {
                fs.unlinkSync(targetPath);
                reject(error);
            });
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
