# Celer Package Manager - VS Code Extension

A Visual Studio Code extension that provides a graphical interface for managing packages with the Celer package manager.

## Features

### 📦 Package Management
- **Install Dependencies**: Install all project dependencies with one click
- **Add Packages**: Search and add new packages interactively
- **Remove Packages**: Safely remove packages with confirmation
- **Update Packages**: Update individual packages or all packages at once
- **Search Packages**: Search the Celer registry for packages

### 🌲 Dependency Tree View
- Visual tree view of all installed dependencies in the Explorer sidebar
- Quick actions on each package (update, remove)
- Refresh button to reload dependencies
- Only visible when a Celer project is detected

### 🔔 Notifications & Progress
- Progress indicators for long-running operations
- Update notifications when outdated packages are detected
- Success/error messages for all operations

### ⚙️ Configuration
- **celer.executable**: Path to the Celer executable (default: "celer")
- **celer.autoInstall**: Automatically install dependencies when opening a project (default: false)
- **celer.checkUpdates**: Check for package updates on startup (default: true)

## Requirements

- VS Code 1.107.0 or higher
- Celer package manager installed and available in PATH

## Usage

### Getting Started

1. Open a project with a `celer.toml` or `Celer.toml` file
2. The Celer Dependencies view will appear in the Explorer sidebar
3. Use the toolbar buttons or command palette to manage packages

### Commands

All commands are available from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Celer: Install Dependencies` - Install all project dependencies
- `Celer: Add Package` - Add a new package to the project
- `Celer: Remove Package` - Remove a package from the project
- `Celer: Update Package` - Update one or all packages
- `Celer: Search Packages` - Search for packages in the registry
- `Celer: List Installed Packages` - View all installed packages
- `Celer: Check Outdated Packages` - Check for available updates
- `Celer: Refresh Dependencies` - Refresh the dependency tree view
- `Celer: Show Output` - Show the Celer output channel

### Tree View Actions

Right-click on any package in the Celer Dependencies view to:
- Update the package
- Remove the package

Or use the inline buttons that appear when hovering over packages.

## Extension Settings

Configure the extension in VS Code settings (`Ctrl+,` or `Cmd+,`):

```json
{
  "celer.executable": "celer",
  "celer.autoInstall": false,
  "celer.checkUpdates": true
}
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Compile the extension
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test
```

### Testing the Extension

1. Press `F5` to open a new VS Code window with the extension loaded
2. Open a project with a `celer.toml` file
3. Test the various commands and features

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
