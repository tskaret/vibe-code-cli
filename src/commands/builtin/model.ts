import { CommandDefinition, CommandContext } from '../base.js';

export const modelCommand: CommandDefinition = {
  command: 'model',
  description: 'Show model selection interface',
  handler: ({ setShowModelSelector }: CommandContext) => {
    if (setShowModelSelector) {
      setShowModelSelector(true);
    }
  }
};