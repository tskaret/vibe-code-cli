import { CommandDefinition, CommandContext } from '../base.js';
import { getAvailableCommands } from '../index.js';

export const helpCommand: CommandDefinition = {
  command: 'help',
  description: 'Show help and available commands',
  handler: ({ addMessage }: CommandContext) => {
    const commands = getAvailableCommands();
    const commandList = commands.map(cmd => `/${cmd.command} - ${cmd.description}`).join('\n');
    
    addMessage({
      role: 'system',
      content: `Available Commands:
${commandList}

Command Navigation:
- Type '/' to see available slash commands
- Use arrow keys to navigate slash command suggestions
- Press Enter to execute the selected command

Chat Navigation:
- Use arrow keys to navigate chat history

General Commands:
- exit, quit, bye - Exit the application
- Ctrl+C - Exit the application

This is a highly customizable, lightweight, and open-source coding CLI powered by Groq. Ask for help with coding tasks, debugging issues, or explaining code.`
    });
  }
};