import * as vscode from 'vscode';
import * as os from 'os';
import { Celer } from '../celer';
import { StatusBarManager } from '../statusbar';

/**
 * Selection commands for platform, project, build type, and jobs
 */
export function registerSelectCommands(context: vscode.ExtensionContext, celer: Celer, statusBarManager: StatusBarManager): void {
    // Helper: show a QuickPick that auto-focuses on the current item
    async function pickCurrent<T extends vscode.QuickPickItem>(
        title: string, placeHolder: string,
        items: T[], currentIndex: number,
        onSelect: (item: T) => Promise<void>
    ): Promise<void> {
        const qp = vscode.window.createQuickPick<T>();
        qp.title = title;
        qp.placeholder = placeHolder;
        qp.items = items;
        // Scroll to & highlight the current item
        if (currentIndex >= 0 && currentIndex < items.length) {
            qp.activeItems = [items[currentIndex]];
        }
        qp.onDidAccept(async () => {
            const selected = qp.selectedItems[0];
            if (selected) {
                qp.hide();
                await onSelect(selected);
            }
        });
        qp.onDidHide(() => qp.dispose());
        qp.show();
    }

    context.subscriptions.push(vscode.commands.registerCommand('celer.selectPlatform', async (args?: { platform?: string }) => {
        // Direct selection from tree view (no QuickPick)
        if (args?.platform) {
            await celer.runCommand(['configure', `--platform=${args.platform}`]);
            await statusBarManager.updateStatusBarItems();
            vscode.commands.executeCommand('celer.sidebarRefresh');
            vscode.window.showInformationMessage(`Platform set to: ${args.platform}`);
            return;
        }

        const config = await celer.readCelerConfig();
        const platforms = await celer.getAvailablePlatforms();

        if (platforms.length === 0) {
            vscode.window.showWarningMessage('No platforms found in conf/platforms directory');
            return;
        }

        const currentPlatform = config.currentPlatform;
        const items = platforms.map(p => ({
            label: p,
            platform: p,
        }));
        const idx = items.findIndex(i => i.platform === currentPlatform);

        await pickCurrent('Celer Platform', 'Select a platform', items, idx, async (item: any) => {
            await celer.runCommand(['configure', `--platform=${item.platform}`]);
            await statusBarManager.updateStatusBarItems();
            vscode.commands.executeCommand('celer.sidebarRefresh');
            vscode.window.showInformationMessage(`Platform set to: ${item.platform}`);
        });
    }),

    vscode.commands.registerCommand('celer.selectProject', async (args?: { project?: string }) => {
        // Direct selection from tree view (no QuickPick)
        if (args?.project) {
            await celer.runCommand(['configure', `--project=${args.project}`]);
            await statusBarManager.updateStatusBarItems();
            vscode.commands.executeCommand('celer.sidebarRefresh');
            vscode.window.showInformationMessage(`Project set to: ${args.project}`);
            return;
        }

        const config = await celer.readCelerConfig();
        const projects = await celer.getAvailableProjects();

        if (projects.length === 0) {
            vscode.window.showWarningMessage('No projects found in conf/projects directory');
            return;
        }

        const currentProject = config.currentProject;
        const items = projects.map(p => ({
            label: p,
            project: p,
        }));
        const idx = items.findIndex(i => i.project === currentProject);

        await pickCurrent('Celer Project', 'Select a project', items, idx, async (item: any) => {
            await celer.runCommand(['configure', `--project=${item.project}`]);
            await statusBarManager.updateStatusBarItems();
            vscode.commands.executeCommand('celer.sidebarRefresh');
            vscode.window.showInformationMessage(`Project set to: ${item.project}`);
        });
    }),

    vscode.commands.registerCommand('celer.selectBuildType', async (args?: { buildType?: string }) => {
        // Direct selection from tree view (no QuickPick)
        if (args?.buildType) {
            await celer.runCommand(['configure', `--build-type=${args.buildType}`]);
            await statusBarManager.updateStatusBarItems();
            vscode.commands.executeCommand('celer.sidebarRefresh');
            vscode.window.showInformationMessage(`Build type set to: ${args.buildType}`);
            return;
        }

        const config = await celer.readCelerConfig();
        const types = await celer.getAvailableBuildTypes();

        const currentBuildType = config.currentBuildType?.toLowerCase();
        const items = types.map(t => ({
            label: t,
            buildType: t,
        }));
        const idx = items.findIndex(i => i.buildType.toLowerCase() === currentBuildType);

        await pickCurrent('Celer Build Type', 'Select a build type', items, idx, async (item: any) => {
            await celer.runCommand(['configure', `--build-type=${item.buildType}`]);
            await statusBarManager.updateStatusBarItems();
            vscode.commands.executeCommand('celer.sidebarRefresh');
            vscode.window.showInformationMessage(`Build type set to: ${item.buildType}`);
        });
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
        vscode.commands.registerCommand('celer.selectJobs', async (args?: { jobs?: number }) => {
            // Direct selection from tree view (no QuickPick)
            if (args?.jobs !== undefined) {
                await celer.runCommand(['configure', `--jobs=${args.jobs}`]);
                await statusBarManager.updateStatusBarItems();
                vscode.commands.executeCommand('celer.sidebarRefresh');
                vscode.window.showInformationMessage(`Build jobs set to: ${args.jobs}`);
                return;
            }

            const config = await celer.readCelerConfig();
            const currentJobs = config.jobs;
            const cpuCount = os.cpus().length;
            const padWidth = String(cpuCount).length;

            const items = Array.from({ length: cpuCount }, (_, i) => i + 1).map(jobNum => {
                const jobText = jobNum === 1 ? 'job' : 'jobs';
                const paddedJobNum = String(jobNum).padStart(padWidth, '0');

                let description = '';
                if (jobNum === cpuCount) {
                    description = 'Maximum (all cores)';
                } else if (jobNum === Math.ceil(cpuCount * 0.75)) {
                    description = 'Recommended (75%)';
                } else if (jobNum === Math.ceil(cpuCount / 2)) {
                    description = 'Balanced (50%)';
                }

                return {
                    label: `${paddedJobNum} ${jobText}`,
                    description,
                    value: jobNum,
                };
            });

            const idx = items.findIndex(i => i.value === currentJobs);

            const qp = vscode.window.createQuickPick<(typeof items)[0]>();
            qp.title = 'Celer Build Jobs';
            qp.placeholder = `Select parallel build jobs (1-${cpuCount} cores available)`;
            qp.items = items;
            if (idx >= 0) {
                qp.activeItems = [items[idx]];
            }
            qp.onDidAccept(async () => {
                const selected = qp.selectedItems[0];
                if (selected) {
                    qp.hide();
                    await celer.runCommand(['configure', `--jobs=${selected.value}`]);
                    await statusBarManager.updateStatusBarItems();
                    vscode.commands.executeCommand('celer.sidebarRefresh');
                    vscode.window.showInformationMessage(`Build jobs set to: ${selected.value}`);
                }
            });
            qp.onDidHide(() => qp.dispose());
            qp.show();
        })
    );
}
