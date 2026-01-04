import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Configure global settings for workspace
 */
export function registerConfigureCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.configure', async () => {
        const configType = await vscode.window.showQuickPick(
            [
                { label: '$(cloud) Offline Mode', value: 'offline', description: 'Enable/disable offline mode' },
                { label: '$(file-code) Verbose Output', value: 'verbose', description: 'Enable/disable verbose output' },
                { label: '$(database) Binary Cache', value: 'binaryCache', description: 'Configure binary cache' },
                { label: '$(zap) CCache', value: 'ccache', description: 'Configure ccache' },
                { label: '$(globe) Http(s) Proxy', value: 'proxy', description: 'Configure Http(s) proxy' },
                { label: '$(file-code) Open celer.toml', value: 'openToml', description: 'Edit configuration file directly' }
            ],
            { placeHolder: 'Select configuration category' }
        );

        if (!configType) {
            return;
        }

        if (configType.value === 'openToml') {
            const files = await vscode.workspace.findFiles('celer.toml', null, 1);
            if (files.length > 0) {
                const doc = await vscode.workspace.openTextDocument(files[0]);
                await vscode.window.showTextDocument(doc);
            } else {
                vscode.window.showWarningMessage('celer.toml not found');
            }
            return;
        }

        switch (configType.value) {
                case 'offline': {
                    const action = await vscode.window.showQuickPick(
                        [
                            { label: '$(check) Enable', value: 'true', description: 'Enable offline mode' },
                            { label: '$(x) Disable', value: 'false', description: 'Disable offline mode' }
                        ],
                        { placeHolder: 'Select offline mode state' }
                    );
                    if (action) {
                        // Use --offline=true/false format to ensure proper parsing
                        await celer.runCommandInTerminal(['configure', `--offline=${action.value}`]);
                    }
                    break;
                }

                case 'verbose': {
                    const action = await vscode.window.showQuickPick(
                        [
                            { label: '$(check) Enable', value: 'true', description: 'Enable verbose output' },
                            { label: '$(x) Disable', value: 'false', description: 'Disable verbose output' }
                        ],
                        { placeHolder: 'Select verbose output state' }
                    );
                    if (action) {
                        // Use --verbose=true/false format to ensure proper parsing
                        await celer.runCommandInTerminal(['configure', `--verbose=${action.value}`]);
                    }
                    break;
                }

                case 'binaryCache': {
                    const cacheOption = await vscode.window.showQuickPick(
                        [
                            { label: 'Cache Directory', value: 'binary-cache-dir', description: 'Set binary cache directory' },
                            { label: 'Cache Token', value: 'binary-cache-token', description: 'Set authentication token' }
                        ],
                        { placeHolder: 'Select cache setting' }
                    );
                    if (!cacheOption) { return; }

                    const value = await vscode.window.showInputBox({
                        prompt: `Enter ${cacheOption.label}`,
                        placeHolder: cacheOption.value === 'binary-cache-dir' ? '/path/to/cache' : 'your-token'
                    });
                    if (value) {
                        await celer.runCommandInTerminal(['configure', `--${cacheOption.value}=${value}`]);
                    }
                    break;
                }

                case 'proxy': {
                    const proxyOption = await vscode.window.showQuickPick(
                        [
                            { label: 'Proxy Host', value: 'proxy-host', description: 'Set proxy server hostname' },
                            { label: 'Proxy Port', value: 'proxy-port', description: 'Set proxy server port' }
                        ],
                        { placeHolder: 'Select proxy setting' }
                    );
                    if (!proxyOption) { return; }

                    const value = await vscode.window.showInputBox({
                        prompt: `Enter ${proxyOption.label}`,
                        placeHolder: proxyOption.value === 'proxy-host' ? '127.0.0.1' : '7890',
                        validateInput: (value) => {
                            if (proxyOption.value === 'proxy-port') {
                                const port = parseInt(value);
                                return (isNaN(port) || port < 1 || port > 65535) ? 'Please enter a valid port (1-65535)' : undefined;
                            }
                            return undefined;
                        }
                    });
                    if (value) {
                        await celer.runCommandInTerminal(['configure', `--${proxyOption.value}=${value}`]);
                    }
                    break;
                }

                case 'ccache': {
                    const ccacheOption = await vscode.window.showQuickPick(
                        [
                            { label: 'CCache Enabled', value: 'ccache-enabled', description: 'Enable/disable ccache' },
                            { label: 'CCache Directory', value: 'ccache-dir', description: 'Set ccache directory' },
                            { label: 'CCache Max Size', value: 'ccache-maxsize', description: 'Set maximum cache size' },
                            { label: 'CCache Remote Storage', value: 'ccache-remote-storage', description: 'Set remote storage address' }
                        ],
                        { placeHolder: 'Select ccache setting' }
                    );
                    if (!ccacheOption) { return; }

                    if (ccacheOption.value === 'ccache-enabled') {
                        const enabled = await vscode.window.showQuickPick(
                            [
                                { label: 'Enable', value: 'true' },
                                { label: 'Disable', value: 'false' }
                            ],
                            { placeHolder: 'Select ccache state' }
                        );
                        if (enabled) {
                            await celer.runCommandInTerminal(['configure', `--${ccacheOption.value}=${enabled.value}`]);
                        }
                    } else {
                        const value = await vscode.window.showInputBox({
                            prompt: `Enter ${ccacheOption.label}`,
                            placeHolder: ccacheOption.value === 'ccache-maxsize' ? '5G or 1024M' :
                                ccacheOption.value === 'ccache-dir' ? '/path/to/ccache' :
                                    'remote-storage-url'
                        });
                        if (value) {
                            await celer.runCommandInTerminal(['configure', `--${ccacheOption.value}=${value}`]);
                        }
                    }
                    break;
                }
            }
    })
    );
}
