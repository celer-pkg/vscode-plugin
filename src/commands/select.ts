import * as vscode from 'vscode';
import * as os from 'os';
import { Celer } from '../celer';
import { StatusBarManager } from '../statusbar';

/**
 * Selection commands for platform, project, and build type
 */
export function registerSelectCommands(context: vscode.ExtensionContext, celer: Celer, statusBarManager: StatusBarManager
): void {
    context.subscriptions.push(vscode.commands.registerCommand('celer.selectPlatform', async () => {
        const config = await celer.readCelerConfig();
        const availablePlatforms = await celer.getAvailablePlatforms();

        if (availablePlatforms.length === 0) {
            vscode.window.showWarningMessage('No platforms found in conf/platforms directory');
            return;
        }

        const items = availablePlatforms.map(platform => ({
            label: platform === config.currentPlatform ? `$(check) ${platform}` : `      ${platform}`,
            picked: platform === config.currentPlatform,
            platform: platform
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a platform',
            title: 'Celer Platform'
        });

        if (selected) {
            try {
                await celer.runCommand(['configure', '--platform', selected.platform]);
                await statusBarManager.updateStatusBarItems();
                vscode.window.showInformationMessage(`Platform set to: ${selected.platform}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to set platform: ${error}`);
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
            label: project === config.currentProject ? `$(check) ${project}` : `      ${project}`,
            picked: project === config.currentProject,
            project: project
        }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a project',
                title: 'Celer Project'
            });

            if (selected) {
                try {
                    await celer.runCommand(['configure', '--project', selected.project]);
                    await statusBarManager.updateStatusBarItems();
                    vscode.window.showInformationMessage(`Project set to: ${selected.project}`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to set project: ${error}`);
                    await statusBarManager.updateStatusBarItems();
                }
            }
        }),

        vscode.commands.registerCommand('celer.selectBuildType', async () => {
            const config = await celer.readCelerConfig();
            const availableBuildTypes = await celer.getAvailableBuildTypes();

            const items = availableBuildTypes.map(buildType => ({
            label: buildType === config.currentBuildType ? `$(check) ${buildType}` : `      ${buildType}`,
            picked: buildType === config.currentBuildType,
            buildType: buildType
        }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a build type',
                title: 'Celer Build Type'
            });

            if (selected) {
                try {
                    await celer.runCommand(['configure', '--build-type', selected.buildType]);
                    await statusBarManager.updateStatusBarItems();
                    vscode.window.showInformationMessage(`Build type set to: ${selected.buildType}`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to set build type: ${error}`);
                    await statusBarManager.updateStatusBarItems();
                }
            }
        })
    );
}

/**
 * Selection command for jobs configuration
 */
export function registerSelectJobsCommand(
    context: vscode.ExtensionContext,
    celer: Celer,
    statusBarManager: StatusBarManager
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.selectJobs', async () => {
            const config = await celer.readCelerConfig();
            const currentJobs = config.jobs;
            const cpuCount = os.cpus().length;

            // Generate job options from 1 to CPU count
            const items = Array.from({ length: cpuCount }, (_, i) => i + 1).map(jobNum => ({
                label: jobNum === currentJobs ? `$(check) ${jobNum}` : `      ${jobNum}`,
                picked: jobNum === currentJobs,
                value: jobNum
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Select parallel build jobs (1-${cpuCount})`,
                title: 'Celer Build Jobs'
            });

            if (selected) {
                try {
                    await celer.runCommand(['configure', '--jobs', selected.value.toString()]);
                    await statusBarManager.updateStatusBarItems();
                    vscode.window.showInformationMessage(`Build jobs set to: ${selected.value}`);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to set jobs: ${error}`);
                    await statusBarManager.updateStatusBarItems();
                }
            }
        })
    );
}
