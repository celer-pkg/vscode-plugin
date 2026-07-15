import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Configure settings for your workspace.
 */
export function registerConfigureCommand(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.configure', async () => {
        // Helper: show a boolean picker that auto-focuses on the current value
        async function pickBool(title: string, currentValue: string | boolean | undefined): Promise<string | undefined> {
            const isTrue = currentValue === true || currentValue === 'true';
            const items = [
                { label: 'Enable',  value: 'true',  picked: isTrue },
                { label: 'Disable', value: 'false', picked: !isTrue },
            ];
            const qp = vscode.window.createQuickPick<(typeof items)[0]>();
            qp.title = title;
            qp.items = items;
            qp.activeItems = [isTrue ? items[0] : items[1]];
            return new Promise(resolve => {
                qp.onDidAccept(() => { const s = qp.selectedItems[0]; qp.hide(); resolve(s?.value); });
                qp.onDidHide(() => { qp.dispose(); resolve(undefined); });
                qp.show();
            });
        }

        // Helper: open a native folder picker and return the selected path
        async function pickDir(title: string): Promise<string | undefined> {
            const uris = await vscode.window.showOpenDialog({
                title,
                canSelectFolders: true,
                canSelectFiles: false,
                canSelectMany: false,
                openLabel: 'Select Folder',
            });
            return uris?.[0]?.fsPath;
        }

        const toml = await celer.readFullToml();
        const main = toml.main || toml || {};

        const onOff = (v: any) => v === true || v === 'true' ? 'ON' : 'OFF';
        const configType = await vscode.window.showQuickPick(
            [
                { label: '$(cloud) Offline Mode', value: 'offline', description: `Enable/disable offline mode (${onOff(main.offline)})` },
                { label: '$(file-code) Verbose Output', value: 'verbose', description: `Enable/disable verbose output (${onOff(main.verbose)})` },
                { label: '$(database) Package Cache', value: 'pkgcache', description: 'Configure package cache' },
                { label: '$(cloud-download) Downloads', value: 'downloads', description: 'Set download directory' },
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
                const action = await pickBool('Offline Mode', main.offline);
                if (action) {
                    await celer.runCommandInTerminal(['configure', `--offline=${action}`]);
                }
                break;
            }

            case 'verbose': {
                const action = await pickBool('Verbose Output', main.verbose);
                if (action) {
                    await celer.runCommandInTerminal(['configure', `--verbose=${action}`]);
                }
                break;
            }

            case 'pkgcache': {
                const pk = toml.pkgcache || {};
                const onOff = (v: any) => v === true ? 'ON' : 'OFF';
                const cacheOption = await vscode.window.showQuickPick(
                    [
                        { label: 'Cache Directory', value: 'pkgcache-dir', description: 'Set package cache directory' },
                        { label: 'Cache Writable', value: 'pkgcache-writable', description: `Enable/disable package cache writes (${onOff(pk.writable)})` },
                        { label: 'Cache Artifacts', value: 'pkgcache-cache-artifacts', description: `Cache built artifacts (${onOff(pk.cache_artifacts)})` },
                        { label: 'Cache Downloads', value: 'pkgcache-cache-downloads', description: `Cache downloaded sources (${onOff(pk.cache_downloads)})` }
                    ],
                    { placeHolder: 'Select package cache setting' }
                );
                if (!cacheOption) { return; }

                if (cacheOption.value === 'pkgcache-dir') {
                    const value = await pickDir('Select Package Cache Directory');
                    if (value) {
                        await celer.runCommandInTerminal(['configure', `--pkgcache-dir=${value}`]);
                    }
                } else {
                    // pkgcache booleans are in [pkgcache] section (e.g. writable, cache_artifacts, cache_downloads)
                    const keyMap: Record<string, string> = {
                        'pkgcache-writable': 'writable',
                        'pkgcache-cache-artifacts': 'cache_artifacts',
                        'pkgcache-cache-downloads': 'cache_downloads',
                    };
                    const realKey = keyMap[cacheOption.value] || cacheOption.value;
                    const currentVal = (toml.pkgcache || {})[realKey];
                    const action = await pickBool(cacheOption.label, currentVal);
                    if (action) {
                        await celer.runCommandInTerminal(['configure', `--${cacheOption.value}=${action}`]);
                    }
                }
                break;
            }

            case 'downloads': {
                const value = await pickDir('Select Downloads Directory');
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
                const cc = toml.ccache || {};
                const onOff = (v: any) => v === true ? 'ON' : 'OFF';
                const ccacheOption = await vscode.window.showQuickPick(
                    [
                        { label: 'CCache Enabled', value: 'ccache-enabled', description: `Enable/disable ccache (${onOff(cc.enabled)})` },
                        { label: 'CCache Directory', value: 'ccache-dir', description: 'Set ccache directory' },
                        { label: 'CCache Max Size', value: 'ccache-maxsize', description: 'Set maximum cache size' },
                        { label: 'CCache Remote Storage', value: 'ccache-remote-storage', description: 'Set remote storage address' },
                        { label: 'CCache Remote Only', value: 'ccache-remote-only', description: `Use remote ccache only (${onOff(cc.remote_only)})` }
                    ],
                    { placeHolder: 'Select ccache setting' }
                );
                if (!ccacheOption) { return; }

                if (ccacheOption.value === 'ccache-enabled' || ccacheOption.value === 'ccache-remote-only') {
                    const currentVal = ccacheOption.value === 'ccache-enabled' ? cc.enabled : cc.remote_only;
                    const action = await pickBool(ccacheOption.label, currentVal);
                    if (action) {
                        await celer.runCommandInTerminal(['configure', `--${ccacheOption.value}=${action}`]);
                    }
                } else if (ccacheOption.value === 'ccache-dir') {
                    const value = await pickDir('Select CCache Directory');
                    if (value) {
                        await celer.runCommandInTerminal(['configure', `--ccache-dir=${value}`]);
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
