/**
 * Central registry for all Celer commands
 * Each command is organized in its own file for better maintainability
 */

export { registerInitCommand } from './init';
export { registerInstallCommand } from './install';
export { registerRemoveCommand } from './remove';
export { registerUpdateCommand } from './update';
export { registerSearchCommand } from './search';
export { registerCleanCommand } from './clean';
export { registerAutoremoveCommand } from './autoremove';
export { registerTreeCommand } from './tree';
export { registerReverseCommand } from './reverse';
export { registerDeployCommand } from './deploy';
export { registerCreateCommand } from './create';
export { registerConfigureCommand } from './configure';
export { registerVersionCommand } from './version';
export { registerSelectCommands } from './select';
