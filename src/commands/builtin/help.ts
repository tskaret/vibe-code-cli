import { CommandDefinition, CommandContext } from '../base.js';
import { getAvailableCommands } from '../index.js';

export const helpCommand: CommandDefinition = {
  command: 'help',
  description: 'Show available commands and usage information',
  handler: ({ addMessage }: CommandContext) => {
    const commands = getAvailableCommands();
    const commandList = commands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n');
    
    addMessage({
      role: 'system',
      content: `Available Commands:

${commandList}

Navigation:
- Type '/' to see available slash commands
- Use arrow keys to navigate slash command suggestions
- Press Enter to execute the selected command

General Commands:
- exit, quit, bye - Exit the application
- Ctrl+C - Exit the application

This is a local CLI assistant powered by Groq. You can ask questions, request code changes, or get help with various tasks.`
    });
  }
};