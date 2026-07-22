import * as vscode from 'vscode';
import { Celer } from '../celer';

/**
 * NFS setup commands — run celer nfs-client / nfs-server in terminal.
 */
export function registerNfsCommands(context: vscode.ExtensionContext, celer: Celer): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('celer.nfsClient', async () => {
            await celer.runCommandInTerminal(['nfs-client']);
        }),
        vscode.commands.registerCommand('celer.nfsServer', async () => {
            await celer.runCommandInTerminal(['nfs-server']);
        })
    );
}
