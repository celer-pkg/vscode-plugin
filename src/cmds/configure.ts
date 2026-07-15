import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Configure settings for your workspace.
 */
export function registerConfigureCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.configure', async () => {
        const configType = await vscode.window.showQuickPick(
            [
                { label: '$(cloud) Offline Mode', value: 'offline', description: 'Enable/disable offline mode' },
                { label: '$(file-code) Verbose Output', value: 'verbose', description: 'Enable/disable verbose output' },
                { label: '$(database) Package Cache', value: 'pkgcache', description: 'Configure package cache' },
                { label: '$(folder-downloads) Downloads', value: 'downloads', description: 'Set download directory' },
                { label: '$(zap) CCache', value: 'ccache', description: 'Configure ccache' },
                { label: '$(globe) Http(s) Proxy', value: 'proxy', description: 'Configure Http(s) proxy' },
                { label: '$(package) Port Configuration', value: 'port', description: 'Configure port URL/ref' },
                { label: '$(file-code) Open celer.toml', value: 'openToml', description: 'Edit configuration file directly' }
            ],
            { placeHolder: 'Select configuration category' }
        );

        if (!configType) { return; }

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
                    await celer.runCommandInTerminal(['configure', `--verbose=${action.value}`]);
                }
                break;
            }

            case 'pkgcache': {
                const cacheOption = await vscode.window.showQuickPick(
                    [
                        { label: 'Cache Directory', value: 'pkgcache-dir', description: 'Set package cache directory' },
                        { label: 'Cache Writable', value: 'pkgcache-writable', description: 'Enable/disable package cache writes' },
                        { label: 'Cache Artifacts', value: 'pkgcache-cache-artifacts', description: 'Cache built artifacts' },
                        { label: 'Cache Downloads', value: 'pkgcache-cache-downloads', description: 'Cache downloaded sources' }
                    ],
                    { placeHolder: 'Select package cache setting' }
                );
                if (!cacheOption) { return; }

                if (cacheOption.value === 'pkgcache-dir') {
                    const value = await vscode.window.showInputBox({
                        prompt: 'Enter package cache directory path',
                        placeHolder: '/path/to/cache'
                    });
                    if (value) {
                        await celer.runCommandInTerminal(['configure', `--pkgcache-dir=${value}`]);
                    }
                } else {
                    const action = await vscode.window.showQuickPick(
                        [
                            { label: '$(check) Enable', value: 'true' },
                            { label: '$(x) Disable', value: 'false' }
                        ],
                        { placeHolder: `Select ${cacheOption.label} state` }
                    );
                    if (action) {
                        await celer.runCommandInTerminal(['configure', `--${cacheOption.value}=${action.value}`]);
                    }
                }
                break;
            }

            case 'downloads': {
                const value = await vscode.window.showInputBox({
                    prompt: 'Enter downloads directory path',
                    placeHolder: '/path/to/downloads'
                });
                if (value) {
                    await celer.runCommandInTerminal(['configure', `--downloads=${value}`]);
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

            case 'port': {
                const portName = await vscode.window.showInputBox({
                    prompt: 'Enter port name@version (e.g. eigen@3.4.0)',
                    placeHolder: 'eigen@3.4.0',
                    validateInput: (value) => {
                        return value.includes('@') ? undefined : 'Port must include version (name@version)';
                    }
                });
                if (!portName) { return; }

                const portOption = await vscode.window.showQuickPick(
                    [
                        { label: 'Port URL', value: 'port-url', description: 'Override the source URL for this port' },
                        { label: 'Port Ref', value: 'port-ref', description: 'Pin to a branch, tag, or commit' }
                    ],
                    { placeHolder: 'What do you want to configure for this port?' }
                );
                if (!portOption) { return; }

                const value = await vscode.window.showInputBox({
                    prompt: `Enter ${portOption.label} for ${portName}`,
                    placeHolder: portOption.value === 'port-url'
                        ? 'https://github.com/example/repo.git'
                        : 'main / v1.2.3 / abc123'
                });
                if (value) {
                    await celer.runCommandInTerminal(['configure', `--port=${portName}`, `--${portOption.value}=${value}`]);
                }
                break;
            }

            case 'ccache': {
                const ccacheOption = await vscode.window.showQuickPick(
                    [
                        { label: 'CCache Enabled', value: 'ccache-enabled', description: 'Enable/disable ccache' },
                        { label: 'CCache Directory', value: 'ccache-dir', description: 'Set ccache directory' },
                        { label: 'CCache Max Size', value: 'ccache-maxsize', description: 'Set maximum cache size' },
                        { label: 'CCache Remote Storage', value: 'ccache-remote-storage', description: 'Set remote storage address' },
                        { label: 'CCache Remote Only', value: 'ccache-remote-only', description: 'Use remote ccache only' }
                    ],
                    { placeHolder: 'Select ccache setting' }
                );
                if (!ccacheOption) { return; }

                if (ccacheOption.value === 'ccache-enabled' || ccacheOption.value === 'ccache-remote-only') {
                    const enabled = await vscode.window.showQuickPick(
                        [{ label: 'Enable', value: 'true' }, { label: 'Disable', value: 'false' }],
                        { placeHolder: `Select ${ccacheOption.label} state` }
                    );
                    if (enabled) {
                        await celer.runCommandInTerminal(['configure', `--${ccacheOption.value}=${enabled.value}`]);
                    }
                } else {
                    const value = await vscode.window.showInputBox({
                        prompt: `Enter ${ccacheOption.label}`,
                        placeHolder: ccacheOption.value === 'ccache-maxsize' ? '5G or 1024M' :
                            ccacheOption.value === 'ccache-dir' ? '/path/to/ccache' : 'http://host:port/path'
                    });
                    if (value) {
                        await celer.runCommandInTerminal(['configure', `--${ccacheOption.value}=${value}`]);
                    }
                }
                break;
            }
        }
    }));
}
