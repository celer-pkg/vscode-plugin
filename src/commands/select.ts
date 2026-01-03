import * as vscode from 'vscode';
import { Celer } from '../celer';
import { StatusBarManager } from '../statusbar';

/**
 * Selection commands for platform, project, and build type
 */
export function registerSelectCommands(
    context: vscode.ExtensionContext,
    celer: Celer,
    statusBarManager: StatusBarManager
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.selectPlatform', async () => {
            const config = await celer.readCelerConfig();
            const availablePlatforms = await celer.getAvailablePlatforms();

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
                    await celer.writeCelerConfig({ currentPlatform: selected.label });
                    await statusBarManager.updateStatusBarItems();
                    vscode.window.showInformationMessage(`Platform set to: ${selected.label}`);
                } catch (error) {
                    await statusBarManager.updateStatusBarItems();
                }
            }
        }),

        vscode.commands.registerCommand('celer.selectProject', async () => {
            const config = await celer.readCelerConfig();
            const availableProjects = await celer.getAvailableProjects();

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
                    await celer.writeCelerConfig({ currentProject: selected.label });
                    await statusBarManager.updateStatusBarItems();
                    vscode.window.showInformationMessage(`Project set to: ${selected.label}`);
                } catch (error) {
                    await statusBarManager.updateStatusBarItems();
                }
            }
        }),

        vscode.commands.registerCommand('celer.selectBuildType', async () => {
            const config = await celer.readCelerConfig();
            const availableBuildTypes = await celer.getAvailableBuildTypes();

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
                    await celer.writeCelerConfig({ currentBuildType: selected.label });
                    await statusBarManager.updateStatusBarItems();
                    vscode.window.showInformationMessage(`Build type set to: ${selected.label}`);
                } catch (error) {
                    await statusBarManager.updateStatusBarItems();
                }
            }
        })
    );
}
