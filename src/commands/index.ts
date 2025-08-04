import { CommandDefinition, CommandContext } from './base.js';
import { helpCommand } from './builtin/help.js';
import { loginCommand } from './builtin/login.js';
import { modelCommand } from './builtin/model.js';
import { clearCommand } from './builtin/clear.js';

const builtinCommands: CommandDefinition[] = [
  helpCommand,
  loginCommand,
  modelCommand,
  clearCommand,
];

export function getAvailableCommands(): CommandDefinition[] {
  return [...builtinCommands];
}

export function getCommandNames(): string[] {
  return getAvailableCommands().map(cmd => cmd.command);
}

export function handleSlashCommand(
  command: string, 
  context: CommandContext
) {
  // Extract the command part, everything up to the first space or end of string
  const fullCommand = command.slice(1);
  const spaceIndex = fullCommand.indexOf(' ');
  const cmd = spaceIndex > -1 ? fullCommand.substring(0, spaceIndex).toLowerCase() : fullCommand.toLowerCase();
  
  const commandDef = getAvailableCommands().find(c => c.command === cmd);
  
  // Add user message for the command
  context.addMessage({
    role: 'user',
    content: command,
  });
  
  if (commandDef) {
    commandDef.handler(context);
  }
}

export { CommandDefinition, CommandContext } from './base.js';