import { CommandDefinition, CommandContext } from '../base.js';

export const loginCommand: CommandDefinition = {
  command: 'login',
  description: 'Login with your credentials',
  handler: ({ setShowLogin }: CommandContext) => {
    setShowLogin(true);
  }
};