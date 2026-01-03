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
                { label: '$(database) Binary Cache', value: 'cache', description: 'Configure binary cache' },
                { label: '$(globe) Proxy Settings', value: 'proxy', description: 'Configure proxy settings' },
                { label: '$(zap) CCache Settings', value: 'ccache', description: 'Configure ccache' },
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

        try {
            switch (configType.value) {
                case 'offline': {
                    const enabled = await vscode.window.showQuickPick(
                        [
                            { label: 'True', value: 'true' },
                            { label: 'False', value: 'false' }
                        ],
                        { placeHolder: `Select offline state` }
                    );
                    if (enabled) {
                        await celer.runCommand(['configure', `--offline`, enabled.value]);
                        vscode.window.showInformationMessage('Configuration updated');
                    }
                    break;
                }

                case 'verbose': {
                    const enabled = await vscode.window.showQuickPick(
                        [
                            { label: 'True', value: 'true' },
                            { label: 'False', value: 'false' }
                        ],
                        { placeHolder: `Select verbose state` }
                    );
                    if (enabled) {
                        await celer.runCommand(['configure', `--verbose`, enabled.value]);
                        vscode.window.showInformationMessage('Configuration updated');
                    }
                    break;
                }

                case 'cache': {
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
                        await celer.runCommand(['configure', `--${cacheOption.value}`, value]);
                        vscode.window.showInformationMessage('Configuration updated');
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
                        placeHolder: proxyOption.value === 'proxy-host' ? 'proxy.example.com' : '8080',
                        validateInput: (value) => {
                            if (proxyOption.value === 'proxy-port') {
                                const port = parseInt(value);
                                return (isNaN(port) || port < 1 || port > 65535) ? 'Please enter a valid port (1-65535)' : undefined;
                            }
                            return undefined;
                        }
                    });
                    if (value) {
                        await celer.runCommand(['configure', `--${proxyOption.value}`, value]);
                        vscode.window.showInformationMessage('Configuration updated');
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
                            await celer.runCommand(['configure', `--${ccacheOption.value}`, enabled.value]);
                            vscode.window.showInformationMessage('Configuration updated');
                        }
                    } else {
                        const value = await vscode.window.showInputBox({
                            prompt: `Enter ${ccacheOption.label}`,
                            placeHolder: ccacheOption.value === 'ccache-maxsize' ? '5G or 1024M' :
                                ccacheOption.value === 'ccache-dir' ? '/path/to/ccache' :
                                    'remote-storage-url'
                        });
                        if (value) {
                            await celer.runCommand(['configure', `--${ccacheOption.value}`, value]);
                            vscode.window.showInformationMessage('Configuration updated');
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            // Error already shown in celer.configure
        }
    })
    );
}
