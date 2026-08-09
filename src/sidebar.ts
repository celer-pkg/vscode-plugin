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
                const key = msg.key;
                const value = msg.value;
                await this.celerManager.runCommand(['configure', `--${key}=${value}`]);
                vscode.window.showInformationMessage(`Celer: ${key} → ${value}`);
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
            case 'reloadCombos': {
                if (this._view) {
                    const [platforms, projects, buildTypes] = await Promise.all([
                        this.celerManager.getAvailablePlatforms(),
                        this.celerManager.getAvailableProjects(),
                        this.celerManager.getAvailableBuildTypes(),
                    ]);
                    this._view.webview.postMessage({
                        type: 'combosUpdated',
                        platforms, projects, buildTypes,
                        cpuCount: os.cpus().length,
                    });
                }
                break;
            }
            case 'setup': {
                const [host, port] = msg.value.split(':');
                const cmd = msg.remove
                    ? `celer configure --proxy-remove=true`
                    : `celer configure --proxy-host=${host} --proxy-port=${port}`;
                const terminalName = 'Celer Setup';
                let terminal = vscode.window.terminals.find(t => t.name === terminalName);
                if (!terminal) {
                    terminal = vscode.window.createTerminal(terminalName);
                }
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
        const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || os.homedir();

        const placeholder = '\u2014';
        const platform = config?.currentPlatform || 'Not selected | Native toolchain';
        const project = config?.currentProject || 'Not selected';
        const buildType = config?.currentBuildType || placeholder;
        const jobs = config?.jobs;
        const jobsLabel = jobs ? `${String(jobs).padStart(padWidth, '0')} / ${cpuCount} cores` : placeholder;

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
        --radius: 6px;
        --radius-sm: 4px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-sideBar-foreground); padding: 8px 0; }

    .combo-wrap { position: relative; margin: 2px 8px 6px; }
    .combo-label { font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 3px; display: block; letter-spacing: 0.3px; }
    .combo-row { display: flex; position: relative; }
    .combo-input {
        flex: 1; background: var(--input-bg); color: var(--input-fg);
        border: 1px solid var(--input-border); border-radius: var(--radius-sm) 0 0 var(--radius-sm);
        padding: 5px 8px; font-size: 12px; outline: none; min-width: 0;
        transition: border-color .2s;
    }
    .combo-input:focus { border-color: var(--focus-border); }
    .combo-arrow {
        display: flex; align-items: center; justify-content: center;
        width: 28px; background: var(--input-bg); border: 1px solid var(--input-border);
        border-left: none; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; cursor: pointer;
        color: var(--vscode-sideBar-foreground); user-select: none;
        transition: background .15s;
    }
    .combo-arrow:hover { background: var(--hover-bg); }
    .combo-arrow::after {
        content: ''; display: inline-block; width: 0; height: 0;
        border-left: 4px solid currentColor;
        border-top: 2.5px solid transparent;
        border-bottom: 2.5px solid transparent;
        transition: transform .2s; opacity: 0.5;
    }
    .combo-wrap.open .combo-arrow::after { transform: rotate(90deg); }
    .combo-dropdown {
        display: none; position: absolute; left: 0; right: 28px; top: 100%;
        background: var(--list-bg); color: var(--list-fg);
        border: 1px solid var(--list-border); border-top: none;
        border-radius: 0 0 var(--radius-sm) var(--radius-sm); max-height: 180px; overflow-y: auto;
        z-index: 100; box-shadow: 0 4px 8px rgba(0,0,0,0.18);
    }
    .combo-dropdown.show { display: block; }
    .combo-option {
        padding: 5px 10px; font-size: 12px; cursor: pointer; white-space: nowrap;
    }
    .combo-option:hover, .combo-option.highlight { background: var(--hover-bg); }
    .combo-option.selected { background: var(--active-bg); color: var(--active-fg); }

    .cmd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px 8px; }
    .cmd-btn {
        display: flex; align-items: center; gap: 5px;
        background: transparent; color: var(--vscode-sideBar-foreground);
        border: 1px solid var(--vscode-sideBar-border, var(--input-border));
        border-radius: var(--radius-sm); padding: 6px 10px; font-size: 12px;
        cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s, box-shadow .15s;
    }
    .cmd-btn:hover { background: var(--vscode-toolbar-hoverBackground); border-color: var(--vscode-focusBorder); box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
    .cmd-btn:active { background: var(--active-bg); }
    .cmd-icon { width: 16px; text-align: center; flex-shrink: 0; }
    .divider { height: 1px; background: var(--vscode-sideBar-border, var(--input-border)); margin: 8px 8px; opacity: 0.35; }

    .setting-row { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 8px; padding: 4px 10px; min-height: 28px; }
    .setting-label { font-size: 12px; white-space: nowrap; }
    .setting-row-wrap { display: flex; width: 100%; }
    .setting-val {
        flex: 1; background: var(--input-bg); color: var(--input-fg);
        border: 1px solid var(--input-border); border-radius: var(--radius-sm);
        padding: 3px 6px; font-size: 11px; outline: none; min-width: 0;
        transition: border-color .2s;
    }
    .setting-val:focus { border-color: var(--focus-border); }
    .setting-folder {
        flex-shrink: 0; background: transparent; border: 1px solid var(--input-border);
        border-left: none; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        color: var(--vscode-sideBar-foreground); cursor: pointer; padding: 3px 6px; font-size: 11px;
        transition: background .15s;
    }
    .setting-folder:hover { background: var(--hover-bg); }

    .toggle { position: relative; display: inline-block; width: 32px; height: 18px; flex-shrink: 0; cursor: pointer; }
    .setting-row .toggle { justify-self: end; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
        position: absolute; inset: 0; border-radius: 18px; background: var(--vscode-input-border);
        transition: background .25s;
    }
    .toggle-slider::before {
        content: ''; position: absolute; height: 14px; width: 14px; left: 2px; bottom: 2px;
        background: #fff; border-radius: 50%; transition: transform .25s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .toggle input:checked + .toggle-slider { background: var(--vscode-inputOption-activeBackground, var(--vscode-focusBorder)); }
    .toggle input:checked + .toggle-slider::before { transform: translateX(14px); }
    .toggle:hover .toggle-slider { opacity: 0.88; }

    .drawer { margin: 0; border-bottom: 1px solid var(--vscode-sideBar-border, var(--input-border)); }
    .drawer:last-child { border-bottom: none; }
    .drawer-header {
        display: flex; align-items: center; gap: 6px; padding: 8px 10px;
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
        cursor: pointer; user-select: none; transition: background .15s;
        color: var(--vscode-sideBarTitle-foreground, var(--vscode-sideBar-foreground));
    }
    .drawer-header::before, .setting-group-header::before {
        content: ''; display: inline-block; width: 0; height: 0; flex-shrink: 0; margin-right: 6px;
        border-left: 5px solid currentColor;
        border-top: 3px solid transparent;
        border-bottom: 3px solid transparent;
        transition: transform .2s; opacity: 0.5;
    }
    .drawer.open .drawer-header::before,
    .setting-group.open .setting-group-header::before { transform: rotate(90deg); }
    .drawer-header:hover { background: var(--vscode-toolbar-hoverBackground); }
    .drawer-body { display: none; padding: 4px 0 10px; }
    .drawer.open .drawer-body { display: block; }
    .drawer.open .drawer-header { background: var(--vscode-list-inactiveSelectionBackground); }

    .setting-group {
        margin: 4px 6px; border: 1px solid var(--input-border); border-radius: var(--radius);
        overflow: hidden; transition: box-shadow .2s;
        box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
    .setting-group .setting-row { margin: 0; padding: 4px 10px; }
    .setting-group-header {
        padding: 5px 10px; font-size: 11px; font-weight: 600; cursor: pointer;
        display: flex; align-items: center; gap: 4px; user-select: none;
        color: var(--vscode-descriptionForeground); transition: background .15s;
    }
    .setting-group-header:hover { background: var(--hover-bg); }
    .setting-group-body { display: none; }
    .setting-group.open .setting-group-body { display: block; }
    .setting-group.open .setting-group-header { border-bottom: 1px solid var(--input-border); }

    .setup-form {
        margin: 4px 8px; padding: 8px 10px; border: 1px solid var(--input-border);
        border-radius: var(--radius); box-shadow: 0 1px 2px rgba(0,0,0,0.06);
    }
    .setup-form + .setup-form { margin-top: 6px; }
    .setup-title { font-size: 11px; font-weight: 600; margin-bottom: 5px; color: var(--vscode-descriptionForeground); letter-spacing: 0.3px; }
    .setup-input {
        flex: 1; background: var(--input-bg); color: var(--input-fg);
        border: 1px solid var(--input-border); padding: 5px 8px; font-size: 11px;
        outline: none; min-width: 0; transition: border-color .2s;
    }
    .setup-row .setup-input { border-right: none; border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
    .setup-input:not(.setup-row .setup-input) { border-radius: var(--radius-sm); width: 100%; margin-top: 4px; }
    .setup-input:focus { border-color: var(--focus-border); }
    .setup-row { display: flex; }
    .setup-row + .setup-input, .setup-row + .setup-row { margin-top: 4px; }
    .setup-folder {
        background: var(--input-bg); border: 1px solid var(--input-border);
        border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        color: var(--vscode-sideBar-foreground); cursor: pointer; padding: 3px 6px; font-size: 11px;
        transition: background .15s;
    }
    .setup-folder:hover { background: var(--hover-bg); }
    .setup-actions { display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end; }
    .btn-setup, .btn-remove {
        border: none; border-radius: var(--radius-sm); padding: 5px 14px; font-size: 11px;
        cursor: pointer; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase;
        transition: background .15s, box-shadow .15s;
    }
    .btn-remove { background: rgba(255,255,255,0.88); color: #333; border: 1px solid var(--vscode-input-border); }
    .btn-remove:hover:not(:disabled) { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
    .btn-setup { background: var(--vscode-textLink-foreground); color: var(--vscode-editor-background); }
    .btn-setup:hover:not(:disabled) { opacity: 0.88; box-shadow: 0 1px 4px rgba(0,0,0,0.18); }
    .btn-setup:disabled, .btn-remove:disabled { opacity: 0.35; cursor: default; }
</style>
</head>
<body>

<div class="drawer">
    <div class="drawer-header">Configure</div>
    <div class="drawer-body">
        ${combos}
        <div class="divider"></div>
        ${this.settingsHtml(main, pkgcache, ccache, proxy, downloads, wsRoot)}
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

// ── Restore drawer & setting-group state after refresh ──
var savedState = vscodeApi.getState() || {};
if (savedState.drawers) {
    document.querySelectorAll('.drawer').forEach(function(d) {
        var h = d.querySelector('.drawer-header');
        var name = h ? h.textContent.trim() : '';
        if (savedState.drawers[name]) { d.classList.add('open'); }
        else { d.classList.remove('open'); }
    });
} else {
    // First load: only expand the first drawer
    var first = document.querySelector('.drawer');
    if (first) { first.classList.add('open'); }
}
if (savedState.settingGroups) {
    document.querySelectorAll('.setting-group').forEach(function(g) {
        var groupId = g.dataset.group;
        if (groupId && savedState.settingGroups[groupId]) { g.classList.add('open'); }
        else { g.classList.remove('open'); }
    });
}

var combosLoading = false;

var comboOptions = ${JSON.stringify({ platforms, projects, buildTypes, jobOptions }).replace(/</g, '\\u003c')};

document.querySelectorAll('.combo-wrap').forEach(wrap => {
    const input = wrap.querySelector('.combo-input');
    const arrow = wrap.querySelector('.combo-arrow');
    const dropdown = wrap.querySelector('.combo-dropdown');
    const comboId = wrap.dataset.combo;
    const keyMap = { platform: 'platforms', project: 'projects', buildType: 'buildTypes', jobs: 'jobOptions' };
    let highlightIdx = -1;

    function allOptions() { return comboOptions[keyMap[comboId]] || []; }

    function filterOptions(query) {
        const q = query.toLowerCase();
        dropdown.innerHTML = '';
        const filtered = allOptions().filter(o => o.toLowerCase().includes(q));
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
    function openDropdown(showAll) { filterOptions(showAll ? '' : input.value); dropdown.classList.add('show'); wrap.classList.add('open'); highlightIdx = -1; }
    function closeDropdown() { dropdown.classList.remove('show'); wrap.classList.remove('open'); highlightIdx = -1; }
    input.addEventListener('focus', () => { input.select(); openDropdown(true); if (!combosLoading) { combosLoading = true; vscodeApi.postMessage({ type: 'reloadCombos' }); } });
    arrow.addEventListener('click', () => { if (dropdown.classList.contains('show')) { closeDropdown(); } else { openDropdown(true); if (!combosLoading) { combosLoading = true; vscodeApi.postMessage({ type: 'reloadCombos' }); } } });
    input.addEventListener('input', () => { dropdown.classList.add('show'); filterOptions(input.value); });
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
    if (e.data?.type === 'combosUpdated') {
        var cpuCount = e.data.cpuCount;
        var padWidth = String(cpuCount).length;
        var jobOptions = Array.from({ length: cpuCount }, function(_, i) {
            var n = i + 1;
            var desc = '';
            if (n === cpuCount) { desc = ' \u2014 Max (all cores)'; }
            else if (n === Math.ceil(cpuCount * 0.75)) { desc = ' \u2014 Recommended (75%)'; }
            else if (n === Math.ceil(cpuCount / 2)) { desc = ' \u2014 Balanced (50%)'; }
            return String(n).padStart(padWidth, '0') + desc;
        });
        comboOptions = { platforms: e.data.platforms, projects: e.data.projects, buildTypes: e.data.buildTypes, jobOptions: jobOptions };
        combosLoading = false;
    }
});

// ── Proxy setup form ──
function updateSetupBtns(mode) {
    const ok = document.getElementById('proxy-host').value.trim() !== '' &&
               document.getElementById('proxy-port').value.trim() !== '';
    document.querySelectorAll('.btn-setup[data-setup="' + mode + '"], .btn-remove[data-setup="' + mode + '"]').forEach(b => b.disabled = !ok);
}
document.querySelectorAll('.setup-input').forEach(el => {
    el.addEventListener('input', () => updateSetupBtns('proxy'));
    el.dispatchEvent(new Event('input'));
});
document.querySelectorAll('.btn-setup, .btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
        const remove = btn.classList.contains('btn-remove');
        const value = document.getElementById('proxy-host').value.trim() + ':' +
                      document.getElementById('proxy-port').value.trim();
        vscodeApi.postMessage({ type: 'setup', mode: 'proxy', value, remove });
    });
});

document.querySelectorAll('.drawer-header').forEach(header => {
    header.addEventListener('click', () => {
        header.parentElement.classList.toggle('open');
        var state = vscodeApi.getState() || {};
        if (!state.drawers) { state.drawers = {}; }
        state.drawers[header.textContent.trim()] = header.parentElement.classList.contains('open');
        vscodeApi.setState(state);
    });
});

document.querySelectorAll('.setting-group-header').forEach(header => {
    header.addEventListener('click', () => {
        header.parentElement.classList.toggle('open');
        var state = vscodeApi.getState() || {};
        if (!state.settingGroups) { state.settingGroups = {}; }
        var groupId = header.parentElement.dataset.group;
        state.settingGroups[groupId] = header.parentElement.classList.contains('open');
        vscodeApi.setState(state);
    });
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
                <div class="combo-arrow"></div>
            </div>
            <div class="combo-dropdown"></div>
        </div>`;
    }

    private settingsHtml(main: any, pkgcache: any, ccache: any, proxy: any, downloads: string | undefined, wsRoot: string): string {
        const e = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const dlHint = e(wsRoot.replace(/\\/g, '/') + '/downloads');

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
            <div class="setting-group-header">${title}</div>
            <div class="setting-group-body">${body}</div>
        </div>`;

        return '<div class="setting-group">' + toggle('offline', 'Offline Mode', main.offline) + '</div>' +
            '<div class="setting-group">' + toggle('verbose', 'Verbose Output', main.verbose) + '</div>' +
            `<div class="setting-group">
                <div class="setting-row">
                    <span class="setting-label">Downloads</span>
                    <div class="setting-row-wrap">
                        <input class="setting-val" type="text" data-key="downloads" value="${e(downloads)}" placeholder="${dlHint}" data-default="${dlHint}">
                        <button class="setting-folder" data-folder="downloads" data-default="${dlHint}">\u{1F4C1}</button>
                    </div>
                </div>
            </div>` +
            group('pkgcache', 'Package Cache',
                textRow('pkgcache-dir', 'Cache Dir', pkgcache.dir, true) +
                toggle('pkgcache-writable', 'Writable', pkgcache.writable) +
                toggle('pkgcache-cache-artifacts', 'Cache Artifacts', pkgcache.cache_artifacts) +
                toggle('pkgcache-cache-downloads', 'Cache Downloads', pkgcache.cache_downloads)
            ) +
            `<div class="setting-group" data-group="proxy">
                <div class="setting-group-header">HTTP(S) Proxy</div>
                <div class="setting-group-body">
                    <div class="setup-form">
                        <div class="setup-title">Proxy Settings</div>
                        <input class="setup-input" type="text" id="proxy-host" placeholder="Host: proxy.example.com" value="${e(proxy.host)}">
                        <input class="setup-input" type="number" id="proxy-port" placeholder="Port: 8080" value="${e(proxy.port)}">
                        <div class="setup-actions">
                            <button class="btn-remove" data-setup="proxy">Remove</button>
                            <button class="btn-setup" data-setup="proxy">Setup</button>
                        </div>
                    </div>
                </div>
            </div>` +
            group('ccache', 'CCache',
                toggle('ccache-enabled', 'Enabled', ccache.enabled) +
                textRow('ccache-dir', 'Directory', ccache.dir, true) +
                textRow('ccache-maxsize', 'Max Size', ccache.maxsize) +
                textRow('ccache-remote-storage', 'Remote Storage', ccache.remote_storage) +
                toggle('ccache-remote-only', 'Remote Only', ccache.remote_only)
            );
    }
}
