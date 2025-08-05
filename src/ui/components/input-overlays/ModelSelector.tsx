import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ModelSelectorProps {
  onSubmit: (model: string) => void;
  onCancel: () => void;
  currentModel?: string;
}

const AVAILABLE_MODELS = [
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2 Instruct', description: 'Best overall performance' },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', description: '' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Distill)', description: '' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick', description: '' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', description: '' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', description: '' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', description: '' },
];

export default function ModelSelector({ onSubmit, onCancel, currentModel }: ModelSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const currentIndex = AVAILABLE_MODELS.findIndex(model => model.id === currentModel);
    return currentIndex >= 0 ? currentIndex : 0;
  });

  useInput((input, key) => {
    if (key.return) {
      onSubmit(AVAILABLE_MODELS[selectedIndex].id);
      return;
    }

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(AVAILABLE_MODELS.length - 1, prev + 1));
      return;
    }

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="cyan" bold>Select Model</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          Choose a model for your conversation. The chat will be cleared when you switch models.
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {AVAILABLE_MODELS.map((model, index) => (
          <Box key={model.id} marginBottom={index === AVAILABLE_MODELS.length - 1 ? 0 : 1}>
            <Text 
              color={index === selectedIndex ? 'black' : 'white'}
              backgroundColor={index === selectedIndex ? 'cyan' : undefined}
              bold={index === selectedIndex}
            >
              {index === selectedIndex ? <Text bold>{">"}</Text> : "  "} {""}
              {model.name}
              {model.id === currentModel ? ' (current)' : ''}
            </Text>
            {index === selectedIndex && (
              <Box marginLeft={4} marginTop={0}>
                <Text color="gray" dimColor>
                  {model.description}
                </Text>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}