import * as vscode from 'vscode';
import * as os from 'os';
import { Celer } from './celer';

export class CelerSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'celer.sidebar';
    private _view?: vscode.WebviewView;

    constructor(private celerManager: Celer) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
        webviewView.webview.onDidReceiveMessage(msg => this.handleMessage(msg));
        this.refresh();
    }

    async refresh(): Promise<void> {
        if (!this._view) { return; }
        this._view.webview.html = await this.buildHtml();
    }

    private async handleMessage(msg: any): Promise<void> {
        switch (msg.type) {
            case 'select': {
                const { id, value } = msg;
                switch (id) {
                    case 'platform': await this.celerManager.runCommand(['configure', `--platform=${value}`]); break;
                    case 'project': await this.celerManager.runCommand(['configure', `--project=${value}`]); break;
                    case 'buildType': await this.celerManager.runCommand(['configure', `--build-type=${value}`]); break;
                    case 'jobs': await this.celerManager.runCommand(['configure', `--jobs=${value}`]); break;
                }
                await this.refresh();
                break;
            }
            case 'setting': {
                await this.celerManager.runCommandInTerminal(['configure', `--${msg.key}=${msg.value}`]);
                await this.refresh();
                break;
            }
            case 'pickFolder': {
                const uris = await vscode.window.showOpenDialog({
                    title: 'Select Folder', canSelectFolders: true, canSelectFiles: false,
                    canSelectMany: false, openLabel: 'Select', defaultUri: vscode.Uri.file(os.homedir()),
                });
                if (uris?.[0] && this._view) {
                    this._view.webview.postMessage({ type: 'folderResult', key: msg.key, path: uris[0].fsPath });
                }
                break;
            }
            case 'command': {
                vscode.commands.executeCommand(msg.id);
                break;
            }
            case 'setup': {
                const cmd = `sudo celer setup --${msg.mode}=${msg.value}` + (msg.remove ? ' --remove' : '');
                const terminal = vscode.window.createTerminal('Celer Setup');
                terminal.show();
                terminal.sendText(cmd);
                break;
            }
        }
    }

    private async buildHtml(): Promise<string> {
        const config = await this.celerManager.readCelerConfig().catch(() => undefined);
        const toml = await this.celerManager.readFullToml().catch(() => ({}));
        const main = toml.main || {};
        const pkgcache = toml.pkgcache || {};
        const ccache = toml.ccache || {};
        const proxy = toml.proxy || {};
        const downloads = toml.downloads;
        const cpuCount = os.cpus().length;
        const padWidth = String(cpuCount).length;

        const platform = config?.currentPlatform || 'Not set';
        const project = config?.currentProject || 'Not set';
        const buildType = config?.currentBuildType || 'Not set';
        const jobs = config?.jobs;
        const jobsLabel = jobs ? `${String(jobs).padStart(padWidth, '0')} / ${cpuCount} cores` : 'Not set';

        const platforms = await this.celerManager.getAvailablePlatforms();
        const projects = await this.celerManager.getAvailableProjects();
        const buildTypes = await this.celerManager.getAvailableBuildTypes();
        const jobOptions = Array.from({ length: cpuCount }, (_, i) => {
            const n = i + 1;
            let desc = '';
            if (n === cpuCount) { desc = ' \u2014 Max (all cores)'; }
            else if (n === Math.ceil(cpuCount * 0.75)) { desc = ' \u2014 Recommended (75%)'; }
            else if (n === Math.ceil(cpuCount / 2)) { desc = ' \u2014 Balanced (50%)'; }
            return `${String(n).padStart(padWidth, '0')}${desc}`;
        });

        const combos = [
            this.comboboxHtml('platform', 'Selected platform:', platform, platforms),
            this.comboboxHtml('project', 'Selected project:', project, projects),
            this.comboboxHtml('buildType', 'Selected build type:', buildType, buildTypes),
            this.comboboxHtml('jobs', 'Build jobs:', jobsLabel, jobOptions),
        ].join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    :root {
        --input-bg: var(--vscode-input-background);
        --input-fg: var(--vscode-input-foreground);
        --input-border: var(--vscode-input-border, var(--vscode-dropdown-border));
        --focus-border: var(--vscode-focusBorder);
        --list-bg: var(--vscode-dropdown-background);
        --list-fg: var(--vscode-dropdown-foreground);
        --list-border: var(--vscode-dropdown-border);
        --hover-bg: var(--vscode-list-hoverBackground);
        --active-bg: var(--vscode-list-activeSelectionBackground);
        --active-fg: var(--vscode-list-activeSelectionForeground);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-sideBar-foreground); padding: 8px 0; }

    .combo-wrap { position: relative; margin: 2px 8px 4px; }
    .combo-label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 3px; display: block; }
    .combo-row { display: flex; position: relative; }
    .combo-input {
        flex: 1; background: var(--input-bg); color: var(--input-fg);
        border: 1px solid var(--input-border); border-radius: 2px 0 0 2px;
        padding: 4px 6px; font-size: 12px; outline: none; min-width: 0;
    }
    .combo-input:focus { border-color: var(--focus-border); }
    .combo-arrow {
        display: flex; align-items: center; justify-content: center;
        width: 24px; background: var(--input-bg); border: 1px solid var(--input-border);
        border-left: none; border-radius: 0 2px 2px 0; cursor: pointer; font-size: 10px;
        color: var(--vscode-sideBar-foreground); user-select: none;
    }
    .combo-dropdown {
        display: none; position: absolute; left: 0; right: 24px; top: 100%;
        background: var(--list-bg); color: var(--list-fg);
        border: 1px solid var(--list-border); border-top: none;
        border-radius: 0 0 2px 2px; max-height: 180px; overflow-y: auto;
        z-index: 100; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }
    .combo-dropdown.show { display: block; }
    .combo-option {
        padding: 4px 8px; font-size: 12px; cursor: pointer; white-space: nowrap;
    }
    .combo-option:hover, .combo-option.highlight { background: var(--hover-bg); }
    .combo-option.selected { background: var(--active-bg); color: var(--active-fg); }

    .cmd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 4px 8px; }
    .cmd-btn {
        display: flex; align-items: center; gap: 4px;
        background: transparent; color: var(--vscode-sideBar-foreground);
        border: 1px solid var(--vscode-sideBar-border, var(--input-border));
        border-radius: 2px; padding: 5px 8px; font-size: 12px;
        cursor: pointer; white-space: nowrap;
    }
    .cmd-btn:hover { background: var(--vscode-toolbar-hoverBackground); border-color: var(--vscode-focusBorder); }
    .cmd-icon { width: 16px; text-align: center; flex-shrink: 0; }
    .divider { height: 1px; background: var(--vscode-sideBar-border, var(--input-border)); margin: 6px 8px; opacity: 0.4; }

    .setting-row { display: flex; align-items: center; justify-content: space-between; padding: 3px 8px; min-height: 26px; }
    .setting-label { font-size: 12px; flex: 1; }
    .setting-val { width: 110px; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); border-radius: 2px; padding: 2px 4px; font-size: 11px; outline: none; }
    .setting-val:focus { border-color: var(--focus-border); }
    .setting-folder { background: transparent; border: 1px solid var(--input-border); border-left: none; border-radius: 0 2px 2px 0; color: var(--vscode-sideBar-foreground); cursor: pointer; padding: 2px 5px; font-size: 11px; }
    .setting-folder:hover { background: var(--hover-bg); }
    .setting-row-wrap { display: flex; }

    .toggle { position: relative; display: inline-block; width: 30px; height: 17px; flex-shrink: 0; cursor: pointer; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; border-radius: 17px; background: var(--vscode-input-border); transition: background .2s; }
    .toggle-slider::before { content: ''; position: absolute; height: 13px; width: 13px; left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .toggle input:checked + .toggle-slider { background: var(--vscode-inputOption-activeBackground, var(--vscode-focusBorder)); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(13px); }
    .toggle:hover .toggle-slider { opacity: 0.85; }

    .drawer { margin: 0; border-bottom: 1px solid var(--vscode-sideBar-border, var(--input-border)); }
    .drawer:last-child { border-bottom: none; }
    .drawer-header {
        display: flex; align-items: center; gap: 6px; padding: 7px 8px;
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
        cursor: pointer; user-select: none;
        color: var(--vscode-sideBarTitle-foreground, var(--vscode-sideBar-foreground));
    }
    .drawer-header::before {
        content: ''; display: inline-block; width: 0; height: 0; flex-shrink: 0; margin-right: 3px;
        border-left: 3.5px solid currentColor;
        border-top: 3.5px solid transparent;
        border-bottom: 3.5px solid transparent;
        transition: transform .15s; opacity: 0.6;
    }
    .drawer.open .drawer-header::before { transform: rotate(90deg); }
    .drawer-header:hover { background: var(--vscode-toolbar-hoverBackground); }
    .drawer-body { display: none; padding: 4px 0 8px; }
    .drawer.open .drawer-body { display: block; }
    .drawer.open .drawer-header { background: var(--vscode-list-inactiveSelectionBackground); }

    .setting-group { margin: 2px 4px; border: 1px solid var(--input-border); border-radius: 3px; overflow: hidden; }
    .setting-group-header { padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; user-select: none; color: var(--vscode-descriptionForeground); }
    .setting-group-header:hover { background: var(--hover-bg); }
    .setting-group-body { display: none; }
    .setting-group.open .setting-group-body { display: block; }
    .setting-group.open .setting-group-header { border-bottom: 1px solid var(--input-border); }

    .setup-form { margin: 4px 8px; padding: 6px 8px; border: 1px solid var(--input-border); border-radius: 3px; }
    .setup-form + .setup-form { margin-top: 6px; }
    .setup-title { font-size: 11px; font-weight: 600; margin-bottom: 4px; color: var(--vscode-descriptionForeground); }
    .setup-input { flex: 1; background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border); padding: 3px 5px; font-size: 11px; outline: none; min-width: 0; }
    .setup-row .setup-input { border-right: none; border-radius: 2px 0 0 2px; }
    .setup-input:not(.setup-row .setup-input) { border-radius: 2px; width: 100%; }
    .setup-input:focus { border-color: var(--focus-border); }
    .setup-row { display: flex; }
    .setup-row + .setup-input, .setup-row + .setup-row { margin-top: 3px; }
    .setup-folder { background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 0 2px 2px 0; color: var(--vscode-sideBar-foreground); cursor: pointer; padding: 2px 5px; font-size: 11px; }
    .setup-folder:hover { background: var(--hover-bg); }
    .setup-actions { display: flex; gap: 4px; margin-top: 5px; }
    .btn-setup, .btn-remove { flex: 1; border: none; border-radius: 2px; padding: 4px 0; font-size: 11px; cursor: pointer; }
    .btn-remove { background: transparent; color: var(--vscode-errorForeground); border: 1px solid var(--vscode-input-border); }
    .btn-remove:hover:not(:disabled) { background: var(--vscode-toolbar-hoverBackground); }
    .btn-setup { background: transparent; color: var(--vscode-textLink-foreground); border: 1px solid var(--vscode-textLink-foreground); }
    .btn-setup:hover:not(:disabled) { background: var(--vscode-toolbar-hoverBackground); }
    .btn-setup:disabled, .btn-remove:disabled { opacity: 0.4; cursor: default; }
</style>
</head>
<body>

<div class="drawer open">
    <div class="drawer-header">Setup</div>
    <div class="drawer-body">
        <div class="setup-form">
            <div class="setup-title">NFS Server</div>
            <div class="setup-row">
                <input class="setup-input" type="text" id="nfs-server" placeholder="/srv/celer-cache">
                <button class="setup-folder" data-for="nfs-server">\u{1F4C1}</button>
            </div>
            <div class="setup-actions">
                <button class="btn-remove" data-setup="nfs-server">Remove</button>
                <button class="btn-setup" data-setup="nfs-server">Setup</button>
            </div>
        </div>
        <div class="setup-form">
            <div class="setup-title">NFS Client</div>
            <div class="setup-row">
                <input class="setup-input" type="text" id="nfs-client-mount" placeholder="Mount: /home/user/cache">
                <button class="setup-folder" data-for="nfs-client-mount">\u{1F4C1}</button>
            </div>
            <input class="setup-input" type="text" id="nfs-client-server" placeholder="Server: 10.0.8.60:/mnt/data/cache">
            <div class="setup-actions">
                <button class="btn-remove" data-setup="nfs-client">Remove</button>
                <button class="btn-setup" data-setup="nfs-client">Setup</button>
            </div>
        </div>
    </div>
</div>

<div class="drawer">
    <div class="drawer-header">Configure</div>
    <div class="drawer-body">
        ${combos}
        <div class="divider"></div>
        ${this.settingsHtml(main, pkgcache, ccache, proxy, downloads)}
    </div>
</div>

<div class="drawer">
    <div class="drawer-header">Command</div>
    <div class="drawer-body">
        <div class="cmd-grid">
            <button class="cmd-btn" data-cmd="celer.init"><span class="cmd-icon">\u{1F680}</span> Init</button>
            <button class="cmd-btn" data-cmd="celer.install"><span class="cmd-icon">\u{1F4E6}</span> Install</button>
            <button class="cmd-btn" data-cmd="celer.remove"><span class="cmd-icon">\u{1F5D1}</span> Remove</button>
            <button class="cmd-btn" data-cmd="celer.update"><span class="cmd-icon">\u{1F504}</span> Update</button>
            <button class="cmd-btn" data-cmd="celer.search"><span class="cmd-icon">\u{1F50D}</span> Search</button>
            <button class="cmd-btn" data-cmd="celer.create"><span class="cmd-icon">\u{2728}</span> Create</button>
            <button class="cmd-btn" data-cmd="celer.clean"><span class="cmd-icon">\u{1F9F9}</span> Clean</button>
            <button class="cmd-btn" data-cmd="celer.autoremove"><span class="cmd-icon">\u{1F5D1}</span> Autoremove</button>
            <button class="cmd-btn" data-cmd="celer.tree"><span class="cmd-icon">\u{1F333}</span> Tree</button>
            <button class="cmd-btn" data-cmd="celer.reverse"><span class="cmd-icon">\u{1F517}</span> Reverse</button>
            <button class="cmd-btn" data-cmd="celer.deploy"><span class="cmd-icon">\u{1F680}</span> Deploy</button>
            <button class="cmd-btn" data-cmd="celer.version"><span class="cmd-icon">\u{2139}</span> Version</button>
        </div>
    </div>
</div>

<script>
const vscodeApi = acquireVsCodeApi();
const comboOptions = ${JSON.stringify({ platforms, projects, buildTypes, jobOptions }).replace(/</g, '\\u003c')};

document.querySelectorAll('.combo-wrap').forEach(wrap => {
    const input = wrap.querySelector('.combo-input');
    const arrow = wrap.querySelector('.combo-arrow');
    const dropdown = wrap.querySelector('.combo-dropdown');
    const comboId = wrap.dataset.combo;
    const keyMap = { platform: 'platforms', project: 'projects', buildType: 'buildTypes', jobs: 'jobOptions' };
    const allOptions = comboOptions[keyMap[comboId]] || [];
    let highlightIdx = -1;

    function filterOptions(query) {
        const q = query.toLowerCase();
        dropdown.innerHTML = '';
        const filtered = allOptions.filter(o => o.toLowerCase().includes(q));
        if (filtered.length === 0) { dropdown.innerHTML = '<div class="combo-option" style="opacity:0.5">No matches</div>'; return; }
        filtered.forEach((opt, i) => {
            const div = document.createElement('div');
            div.className = 'combo-option' + (opt === input.dataset.orig ? ' selected' : '');
            div.textContent = opt;
            div.addEventListener('mousedown', e => { e.preventDefault(); selectOption(opt); });
            div.dataset.idx = String(i);
            dropdown.appendChild(div);
        });
    }
    function selectOption(opt) {
        input.value = opt; input.dataset.orig = opt; closeDropdown();
        vscodeApi.postMessage({ type: 'select', id: comboId, value: opt.split(' \u2014 ')[0].trim() });
    }
    function openDropdown(showAll) { filterOptions(showAll ? '' : input.value); dropdown.classList.add('show'); highlightIdx = -1; }
    function closeDropdown() { dropdown.classList.remove('show'); highlightIdx = -1; }
    input.addEventListener('focus', () => { input.select(); openDropdown(true); });
    input.addEventListener('input', () => { dropdown.classList.add('show'); filterOptions(input.value); });
    arrow.addEventListener('click', () => { dropdown.classList.contains('show') ? closeDropdown() : openDropdown(true); });
    input.addEventListener('keydown', e => {
        const opts = dropdown.querySelectorAll('.combo-option');
        if (e.key === 'ArrowDown') { e.preventDefault(); highlightIdx = Math.min(highlightIdx + 1, opts.length - 1); opts.forEach((o, i) => o.classList.toggle('highlight', i === highlightIdx)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); highlightIdx = Math.max(highlightIdx - 1, 0); opts.forEach((o, i) => o.classList.toggle('highlight', i === highlightIdx)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (highlightIdx >= 0 && opts[highlightIdx]) opts[highlightIdx].dispatchEvent(new MouseEvent('mousedown', {bubbles: true})); }
        else if (e.key === 'Escape') { closeDropdown(); input.value = input.dataset.orig || ''; }
    });
    input.addEventListener('blur', () => setTimeout(closeDropdown, 150));
    document.addEventListener('click', e => { if (!wrap.contains(e.target)) closeDropdown(); });
});

document.querySelectorAll('.cmd-btn').forEach(btn => { btn.addEventListener('click', () => vscodeApi.postMessage({ type: 'command', id: btn.dataset.cmd })); });

document.querySelectorAll('.toggle input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => vscodeApi.postMessage({ type: 'setting', key: cb.dataset.key, value: cb.checked ? 'true' : 'false' }));
});

let textTimer;
document.querySelectorAll('.setting-val').forEach(input => {
    input.addEventListener('input', () => {
        clearTimeout(textTimer);
        const el = input;
        textTimer = setTimeout(() => vscodeApi.postMessage({ type: 'setting', key: el.dataset.key, value: el.value }), 600);
    });
});

document.querySelectorAll('.setting-folder').forEach(btn => {
    btn.addEventListener('click', () => vscodeApi.postMessage({ type: 'pickFolder', key: btn.dataset.folder }));
});

window.addEventListener('message', e => {
    if (e.data?.type === 'folderResult') {
        const el = document.getElementById(e.data.key) || document.querySelector('.setting-val[data-key="' + e.data.key + '"]');
        if (el) { el.value = e.data.path; el.dispatchEvent(new Event('input')); }
    }
});

// ── Setup folder pickers ──
document.querySelectorAll('.setup-folder').forEach(btn => {
    btn.addEventListener('click', () => vscodeApi.postMessage({ type: 'pickFolder', key: btn.dataset.for }));
});

// ── Setup forms ──
function updateSetupBtns(mode) {
    let ok;
    if (mode === 'nfs-server') {
        ok = document.getElementById('nfs-server').value.trim() !== '';
    } else {
        ok = document.getElementById('nfs-client-mount').value.trim() !== '' &&
             document.getElementById('nfs-client-server').value.trim() !== '';
    }
    document.querySelectorAll('.btn-setup[data-setup="' + mode + '"], .btn-remove[data-setup="' + mode + '"]').forEach(b => b.disabled = !ok);
}
document.querySelectorAll('.setup-input').forEach(el => {
    el.addEventListener('input', () => updateSetupBtns(el.closest('.setup-form').querySelector('.btn-setup').dataset.setup));
    el.dispatchEvent(new Event('input'));
});
document.querySelectorAll('.btn-setup, .btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.setup;
        const remove = btn.classList.contains('btn-remove');
        let value;
        if (mode === 'nfs-server') {
            value = document.getElementById('nfs-server').value.trim();
        } else {
            value = document.getElementById('nfs-client-mount').value.trim() + '@' +
                    document.getElementById('nfs-client-server').value.trim();
        }
        vscodeApi.postMessage({ type: 'setup', mode, value, remove });
    });
});

document.querySelectorAll('.drawer-header').forEach(header => {
    header.addEventListener('click', () => header.parentElement.classList.toggle('open'));
});

document.querySelectorAll('.setting-group-header').forEach(header => {
    header.addEventListener('click', () => header.parentElement.classList.toggle('open'));
});
</script>
</body>
</html>`;
    }

    private comboboxHtml(id: string, title: string, currentValue: string, _options: string[]): string {
        const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        return `
        <div class="combo-wrap" data-combo="${id}">
            <label class="combo-label">${e(title)}</label>
            <div class="combo-row">
                <input class="combo-input" type="text" value="${e(currentValue)}"
                       data-orig="${e(currentValue)}" placeholder="Type to filter..." autocomplete="off">
                <div class="combo-arrow">\u25BE</div>
            </div>
            <div class="combo-dropdown"></div>
        </div>`;
    }

    private settingsHtml(main: any, pkgcache: any, ccache: any, proxy: any, downloads: string | undefined): string {
        const e = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const toggle = (key: string, label: string, checked: any) => `
        <div class="setting-row">
            <span class="setting-label">${label}</span>
            <label class="toggle"><input type="checkbox" data-key="${key}" ${checked ? 'checked' : ''}><span class="toggle-slider"></span></label>
        </div>`;

        const textRow = (key: string, label: string, value: any, hasFolder?: boolean) => `
        <div class="setting-row">
            <span class="setting-label">${label}</span>
            <div class="setting-row-wrap">
                <input class="setting-val" type="text" data-key="${key}" value="${e(value)}" placeholder="Not set">
                ${hasFolder ? '<button class="setting-folder" data-folder="' + key + '">\u{1F4C1}</button>' : ''}
            </div>
        </div>`;

        const group = (id: string, title: string, body: string) => `
        <div class="setting-group" data-group="${id}">
            <div class="setting-group-header">\u25B6 ${title}</div>
            <div class="setting-group-body">${body}</div>
        </div>`;

        return toggle('offline', 'Offline Mode', main.offline) +
            toggle('verbose', 'Verbose Output', main.verbose) +
            textRow('downloads', 'Download Dir', downloads, true) +
            group('pkgcache', 'Package Cache',
                textRow('pkgcache-dir', 'Cache Dir', pkgcache.dir, true) +
                toggle('pkgcache-writable', 'Writable', pkgcache.writable) +
                toggle('pkgcache-cache-artifacts', 'Cache Artifacts', pkgcache.cache_artifacts) +
                toggle('pkgcache-cache-downloads', 'Cache Downloads', pkgcache.cache_downloads)
            ) +
            group('proxy', 'HTTP(S) Proxy',
                textRow('proxy-host', 'Host', proxy.host) +
                textRow('proxy-port', 'Port', proxy.port)
            ) +
            group('ccache', 'CCache',
                toggle('ccache-enabled', 'Enabled', ccache.enabled) +
                textRow('ccache-dir', 'Directory', ccache.dir, true) +
                textRow('ccache-maxsize', 'Max Size', ccache.maxsize) +
                textRow('ccache-remote-storage', 'Remote Storage', ccache.remote_storage) +
                toggle('ccache-remote-only', 'Remote Only', ccache.remote_only)
            );
    }
}
