# Celer - C/C++ Package Manager for VS Code

A Visual Studio Code extension that provides a rich graphical interface for the [Celer](https://github.com/microsoft/celer) C/C++ package manager, bringing all of Celer's functionality directly into your editor.

![Celer](https://img.shields.io/badge/Celer-C%2FC%2B%2B%20Package%20Manager-blue)

---

## Features

### 🚀 One-Click Operations via Status Bar

The extension places frequently used commands right on the VS Code status bar for instant access:

| Button | Command | Description |
|--------|---------|-------------|
| 🚀 | **Init** | Initialize a new Celer project |
| ⚙️ | **Configure** | Open global Celer settings |
| 📦 | **Install** | Install packages with interactive picker |
| 🔄 | **Update** | Select and update packages |
| 🔍 | **Search** | Search the Celer registry |
| ✨ | **Create** | Create platform / project / port |
| 🧹 | **Clean** | Clean build cache (project or specific port) |
| 🗑️ | **Autoremove** | Remove unused libraries automatically |
| 🔗 | **Reverse** | Show reverse dependencies of a package |
| 🌲 | **Tree** | Show dependency tree of a package |
| ℹ️ | **Version** | Display Celer version info |

### 🎛️ Context-Aware Selectors

Quickly switch between build configurations without leaving the editor:

- **Platform Selector** — Switch between configured platforms (e.g., `x64-windows`, `x64-linux`)
- **Project Selector** — Choose the active project in multi-project workspaces
- **Build Type** — Toggle between `debug`, `release`, and custom build types
- **Build Jobs** — Set the number of parallel build jobs

### 📦 Interactive Package Management

All package operations present user-friendly Quick Pick menus:

- **Install** — Browse and select packages from available ports
- **Remove** — Choose installed packages for safe removal
- **Update** — Select individual or all outdated packages to update
- **Search** — Find packages by name with real-time results
- **Reverse Dependencies** — Discover which packages depend on a given port
- **Dependency Tree** — Visualize the full dependency graph of any package

### 🛠️ Project Lifecycle Commands

| Command | Description |
|---------|-------------|
| `Celer: Initialize Project` | Scaffold a new Celer project (`celer.toml`) with configurable conf-repo |
| `Celer: Create Platform/Project/Port` | Bootstrap new platforms, projects, or ports |
| `Celer: Deploy Project` | Deploy built artifacts |
| `Celer: Clean Build Cache` | Clean build artifacts (by project or specific port) |
| `Celer: Auto Remove Unused Libraries` | Prune orphaned dependencies |

### ✨ First-Run Experience

On first activation, the extension offers to automatically download and install the Celer executable — no manual setup required.

### 🔔 Smart Notifications

- Progress indicators during long-running operations
- Update notifications when outdated packages are detected on project open
- Success / error feedback for every operation

### 📋 Output Channel

All Celer command output is logged to a dedicated `Celer` output channel for easy debugging and review.

---

## Requirements

- **VS Code** `1.107.0` or higher
- **Celer** package manager — the extension can auto-download it on first run, or you can [install it manually](https://github.com/microsoft/celer)

The extension activates automatically when a workspace contains a `celer.toml` or `Celer.toml` file.

---

## Getting Started

1. Open any folder containing a `celer.toml` (or create one with `Celer: Initialize Project`)
2. The status bar buttons appear at the bottom of the window
3. Click any button to run the command, or use the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)

---

## Commands Reference

All commands are accessible from the **Command Palette**:

| Command ID | Title |
|------------|-------|
| `celer.init` | Celer: Initialize Project |
| `celer.install` | Celer: Install Package |
| `celer.remove` | Celer: Remove Package |
| `celer.update` | Celer: Update |
| `celer.search` | Celer: Search Packages |
| `celer.clean` | Celer: Clean Build Cache |
| `celer.autoremove` | Celer: Auto Remove Unused Libraries |
| `celer.tree` | Celer: Show Dependency Tree |
| `celer.reverse` | Celer: Show Reverse Dependencies |
| `celer.deploy` | Celer: Deploy Project |
| `celer.create` | Celer: Create Platform/Project/Port |
| `celer.configure` | Celer: Configure Global Settings |
| `celer.version` | Celer: Show Version |
| `celer.selectPlatform` | Celer: Select Platform |
| `celer.selectProject` | Celer: Select Project |
| `celer.selectBuildType` | Celer: Select Build Type |
| `celer.selectJobs` | Celer: Select Build Jobs |
| `celer.installCelerExecutable` | Celer: Download Celer Executable |
| `celer.toggleStatusBar` | Celer: Toggle Status Bar Buttons |
| `celer.resetFirstRun` | Celer: Reset First Run Status |

---

## Extension Settings

Configure the extension in VS Code settings (`Ctrl+,` / `Cmd+,`):

### General

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `celer.executable` | `string` | `"celer"` | Path to the Celer executable |
| `celer.autoInstall` | `boolean` | `false` | Automatically install dependencies on project open |
| `celer.checkUpdates` | `boolean` | `true` | Check for package updates on startup |

### Status Bar Visibility

Toggle individual status bar buttons on or off:

| Setting | Default | Controls |
|---------|---------|----------|
| `celer.statusBar.showVersion` | `true` | Version button |
| `celer.statusBar.showConfigure` | `true` | Configure button |
| `celer.statusBar.showPlatform` | `true` | Platform selector |
| `celer.statusBar.showProject` | `true` | Project selector |
| `celer.statusBar.showBuildType` | `true` | Build type selector |
| `celer.statusBar.showJobs` | `true` | Jobs selector |
| `celer.statusBar.showInit` | `true` | Init button |
| `celer.statusBar.showCreate` | `true` | Create button |
| `celer.statusBar.showInstall` | `true` | Install button |
| `celer.statusBar.showUpdate` | `true` | Update button |
| `celer.statusBar.showSearch` | `true` | Search button |
| `celer.statusBar.showClean` | `true` | Clean button |
| `celer.statusBar.showAutoremove` | `true` | Autoremove button |
| `celer.statusBar.showReverse` | `true` | Reverse button |
| `celer.statusBar.showTree` | `true` | Tree button |

### Example `settings.json`

```json
{
  "celer.executable": "celer",
  "celer.autoInstall": false,
  "celer.checkUpdates": true,
  "celer.statusBar.showBuildType": true,
  "celer.statusBar.showPlatform": true
}
```

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [VS Code](https://code.visualstudio.com/) 1.107.0+

### Build & Run

```bash
# Install dependencies
npm install

# Compile (type-check + lint + bundle)
npm run compile

# Watch mode (auto-rebuild on changes)
npm run watch

# Run tests
npm test
```

### Debugging

1. Press `F5` in VS Code to launch the **Extension Development Host**
2. Open a folder with a `celer.toml` file
3. Set breakpoints in `src/` and test the commands

### Project Structure

```
celer-vscode/
├── src/
│   ├── extension.ts      # Extension entry point & activation
│   ├── celer.ts           # Celer CLI wrapper & config parser
│   ├── installer.ts       # Auto-download & install celer binary
│   ├── statusbar.ts       # Status bar UI management
│   └── cmds/              # Individual command handlers
│       ├── init.ts        #   - celer init
│       ├── install.ts     #   - celer install
│       ├── remove.ts      #   - celer remove
│       ├── update.ts      #   - celer update
│       ├── search.ts      #   - celer search
│       ├── clean.ts       #   - celer clean
│       ├── autoremove.ts  #   - celer autoremove
│       ├── tree.ts        #   - celer tree
│       ├── reverse.ts     #   - celer reverse
│       ├── deploy.ts      #   - celer deploy
│       ├── create.ts      #   - celer create
│       ├── configure.ts   #   - celer configure
│       ├── version.ts     #   - celer version
│       ├── select.ts      #   - platform/project/build-type/jobs pickers
│       └── index.ts       #   - barrel exports
├── esbuild.js             # Build configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Extension manifest
└── README.md
```

## License

See [LICENSE](./LICENSE) for details.

### Project Structure

```
vscode-plugin/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── celerManager.ts           # Celer CLI wrapper
│   ├── dependencyTreeProvider.ts # Tree view provider
│   └── test/
│       └── extension.test.ts     # Tests
├── .vscode/
│   ├── launch.json               # Debug configuration
│   ├── tasks.json                # Build tasks
│   └── settings.json             # Editor settings
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Known Issues

- JSON output format may not be supported by all Celer versions
- Fallback text parsing is provided for compatibility

## Release Notes

### 0.0.1

Initial release:
- Package installation and management
- Dependency tree view
- Search functionality
- Update checks
- Configuration options

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

[MIT License](LICENSE)

---

**Enjoy using Celer Package Manager with VS Code!**


---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
