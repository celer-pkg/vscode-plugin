import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * Register configuration-related commands (platform, project, build type)
 */
export function registerConfigCommands(
    context: vscode.ExtensionContext,
    celerManager: Celer,
    updateStatusBarItems: () => Promise<void>
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.selectPlatform', async () => {
            const config = await celerManager.readCelerConfig();
            const availablePlatforms = await celerManager.getAvailablePlatforms();

            if (availablePlatforms.length === 0) {
                vscode.window.showWarningMessage('No platforms found in conf/platforms directory');
                return;
            }

            const items = availablePlatforms.map(platform => ({
                label: platform,
                description: platform === config.currentPlatform ? '$(check) Current' : '',
                picked: platform === config.currentPlatform
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a platform',
                title: 'Celer Platform'
            });

            if (selected) {
                try {
                    await celerManager.writeCelerConfig({ currentPlatform: selected.label });
                    // Wait a bit more to ensure file is written
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await updateStatusBarItems();
                    vscode.window.showInformationMessage(`Platform set to: ${selected.label}`);
                } catch (error) {
                    // Error already shown in celerManager
                    // Just ensure status bar is still showing correct values
                    await updateStatusBarItems();
                }
            }
        }),

        vscode.commands.registerCommand('celer.selectProject', async () => {
            const config = await celerManager.readCelerConfig();
            const availableProjects = await celerManager.getAvailableProjects();

            if (availableProjects.length === 0) {
                vscode.window.showWarningMessage('No projects found in conf/projects directory');
                return;
            }

            const items = availableProjects.map(project => ({
                label: project,
                description: project === config.currentProject ? '$(check) Current' : '',
                picked: project === config.currentProject
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a project',
                title: 'Celer Project'
            });

            if (selected) {
                try {
                    await celerManager.writeCelerConfig({ currentProject: selected.label });
                    // Wait a bit more to ensure file is written
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await updateStatusBarItems();
                    vscode.window.showInformationMessage(`Project set to: ${selected.label}`);
                } catch (error) {
                    // Error already shown in celerManager
                    await updateStatusBarItems();
                }
            }
        }),

        vscode.commands.registerCommand('celer.selectBuildType', async () => {
            const config = await celerManager.readCelerConfig();
            const availableBuildTypes = await celerManager.getAvailableBuildTypes();

            const items = availableBuildTypes.map(buildType => ({
                label: buildType,
                description: buildType === config.currentBuildType ? '$(check) Current' : '',
                picked: buildType === config.currentBuildType
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a build type',
                title: 'Celer Build Type'
            });

            if (selected) {
                try {
                    await celerManager.writeCelerConfig({ currentBuildType: selected.label });
                    // Wait a bit more to ensure file is written
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await updateStatusBarItems();
                    vscode.window.showInformationMessage(`Build type set to: ${selected.label}`);
                } catch (error) {
                    // Error already shown in celerManager
                    await updateStatusBarItems();
                }
            }
        })
    );
}
