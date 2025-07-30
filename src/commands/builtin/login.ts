import { CommandDefinition, CommandContext } from '../base.js';

export const loginCommand: CommandDefinition = {
  command: 'login',
  description: 'Show login interface',
  handler: ({ setShowLogin }: CommandContext) => {
    setShowLogin(true);
  }
};