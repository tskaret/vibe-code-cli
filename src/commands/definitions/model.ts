import { CommandDefinition, CommandContext } from '../base.js';

export const modelCommand: CommandDefinition = {
  command: 'model',
  description: 'Select your local HuggingFace model with VRAM checking',
  handler: ({ setShowModelSelector }: CommandContext) => {
    if (setShowModelSelector) {
      setShowModelSelector(true);
    }
  }
};