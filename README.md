# Celer - C/C++ Package Manager for VS Code

Graphical interface for the [Celer](https://github.com/microsoft/celer) C/C++ package manager, right in your editor.

## Features

- **Status Bar** — One-click access to init, install, update, search, clean, create, and more
- **Context Selectors** — Switch platform, project, build type, and jobs from the status bar
- **Interactive Pickers** — Browse and select packages, ports, and options via Quick Pick menus
- **Auto-setup** — Automatically downloads the Celer executable on first run
- **Output Channel** — All command output logged to a dedicated `Celer` panel

## Requirements

- VS Code `1.107.0`+
- [Celer](https://github.com/microsoft/celer) (auto-downloaded on first run)

Activates automatically when a `celer.toml` or `Celer.toml` is present.

## Commands

| Command | Description |
|---------|-------------|
| `Celer: Initialize Project` | Scaffold a new `celer.toml` |
| `Celer: Install Package` | Browse and install packages |
| `Celer: Remove Package` | Select and remove packages |
| `Celer: Update` | Update repositories or packages |
| `Celer: Search Packages` | Search the Celer registry |
| `Celer: Create Platform/Project/Port` | Bootstrap platforms, projects, or ports |
| `Celer: Clean Build Cache` | Clean build artifacts |
| `Celer: Auto Remove Unused Libraries` | Prune orphaned dependencies |
| `Celer: Show Dependency Tree` | View a package's dependency graph |
| `Celer: Show Reverse Dependencies` | See what depends on a package |
| `Celer: Deploy Project` | Deploy built artifacts |
| `Celer: Configure Global Settings` | Edit global Celer configuration |
| `Celer: Show Version` | Display Celer version info |

## Extension Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `celer.executable` | `"celer"` | Path to the Celer executable |
| `celer.autoInstall` | `false` | Auto-install dependencies on project open |
| `celer.checkUpdates` | `true` | Check for updates on startup |

Status bar buttons can be individually toggled via `celer.statusBar.show*` settings or the status bar menu button.

## Development

```bash
npm install        # Install dependencies
npm run watch      # Watch & auto-rebuild
npm run package    # Production build
npm test           # Run tests
```

Press `F5` to launch the Extension Development Host for debugging.

## License

[MIT](./LICENSE)

**Enjoy!**
