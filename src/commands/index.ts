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
  const cmd = command.slice(1).toLowerCase();
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